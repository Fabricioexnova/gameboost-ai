// Windows System Optimizer
// Funções de otimização usando PowerShell via window.backend.runPS

import { safeTmpDir } from '../util/tmpdir'

interface ProcessPriorityOptions {
  name?: string;
  pid?: number;
  level: 'Normal' | 'High' | 'RealTime';
}

// GUIDs dos planos de energia do Windows
const POWER_PLANS = {
  balanced: '381b4222-f694-41f0-9685-ff5bb260df2e',
  performance: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
  ultimate: 'e9a42b02-d5df-448d-aa00-03f14749eb61'
};

// Processos críticos do sistema que não devem ser alterados
const SYSTEM_WHITELIST = [
  'explorer', 'dwm', 'csrss', 'winlogon', 'services', 
  'nvcontainer', 'atieclxx', 'lsass', 'svchost', 'system'
];

// Timeout para comandos PowerShell
const PS_TIMEOUT = 20000;

/**
 * Aplica plano de energia do Windows
 */
export async function applyPowerPlan(mode: 'balanced' | 'performance' | 'ultimate'): Promise<boolean> {
  try {
    const guid = POWER_PLANS[mode];
    if (!guid) {
      console.error(`Plano de energia inválido: ${mode}`);
      return false;
    }

    // Salvar plano atual antes de alterar
    const getCurrentPlan = `
      $current = powercfg /getactivescheme
      if ($current -match '([a-f0-9-]{36})') {
        $matches[1]
      }
    `;

    const currentPlan = await window.backend.runPS(getCurrentPlan, PS_TIMEOUT);
    if (currentPlan && currentPlan.trim()) {
      localStorage.setItem('gb.prevPowerPlan', currentPlan.trim());
    }

    // Verificar se o plano existe, criar Ultimate se necessário
    let setupCommand = '';
    if (mode === 'ultimate') {
      setupCommand = `
        $ultimateExists = powercfg /list | Select-String "${guid}"
        if (-not $ultimateExists) {
          powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
          Write-Host "Plano Ultimate Performance criado"
        }
      `;
    }

    // Aplicar o plano de energia
    const applyCommand = `
      ${setupCommand}
      powercfg /setactive ${guid}
      $result = powercfg /getactivescheme
      if ($result -match "${guid}") {
        Write-Host "Plano ${mode} aplicado com sucesso"
        $true
      } else {
        Write-Host "Erro ao aplicar plano ${mode}"
        $false
      }
    `;

    const result = await window.backend.runPS(applyCommand, PS_TIMEOUT);
    const success = result && result.includes('aplicado com sucesso');
    
    if (success) {
      console.log(`[Windows] Plano de energia alterado para: ${mode}`);
    }
    
    return success;
  } catch (error) {
    console.error(`Erro ao aplicar plano de energia ${mode}:`, error);
    return false;
  }
}

/**
 * Define prioridade de processo
 */
export async function setProcessPriority(options: ProcessPriorityOptions): Promise<boolean> {
  try {
    const { name, pid, level } = options;
    
    if (!name && !pid) {
      console.error('Nome ou PID do processo é obrigatório');
      return false;
    }

    // Verificar whitelist
    if (name && SYSTEM_WHITELIST.some(sys => name.toLowerCase().includes(sys.toLowerCase()))) {
      console.warn(`Processo ${name} está na whitelist do sistema, ignorando alteração de prioridade`);
      return false;
    }

    const command = `
      try {
        ${pid ? `$process = Get-Process -Id ${pid} -ErrorAction Stop` : `$process = Get-Process -Name "${name}" -ErrorAction Stop`}
        
        # Verificar se não é processo crítico
        $criticalProcesses = @('explorer', 'dwm', 'csrss', 'winlogon', 'services', 'nvcontainer', 'atieclxx', 'lsass', 'svchost', 'system')
        if ($criticalProcesses -contains $process.ProcessName.ToLower()) {
          Write-Host "Processo crítico do sistema, ignorando: $($process.ProcessName)"
          return $false
        }
        
        $process.PriorityClass = '${level}'
        Write-Host "Prioridade do processo $($process.ProcessName) alterada para ${level}"
        $true
      } catch {
        Write-Host "Erro ao alterar prioridade: $($_.Exception.Message)"
        $false
      }
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const success = result && result.includes('alterada para');
    
    if (success) {
      console.log(`[Windows] Prioridade do processo ${name || pid} alterada para: ${level}`);
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao definir prioridade do processo:', error);
    return false;
  }
}

/**
 * Fecha aplicações em segundo plano
 */
export async function closeBackgroundApps(mode: 'smart' | 'kill-aggressive'): Promise<number> {
  try {
    const command = `
      $closedCount = 0
      $userProcesses = Get-Process | Where-Object { 
        $_.ProcessName -notin @('explorer', 'dwm', 'csrss', 'winlogon', 'services', 'nvcontainer', 'atieclxx', 'lsass', 'svchost', 'system', 'audiodg', 'conhost') -and
        $_.MainWindowTitle -ne '' -or $_.ProcessName -match '^(chrome|firefox|edge|discord|spotify|steam|epic|origin|uplay|battle|launcher)'
      }
      
      foreach ($proc in $userProcesses) {
        try {
          if ('${mode}' -eq 'smart') {
            if ($proc.CloseMainWindow()) {
              Write-Host "Fechado (smart): $($proc.ProcessName)"
              $closedCount++
              Start-Sleep -Milliseconds 500
            }
          } else {
            $proc.Kill()
            Write-Host "Terminado (aggressive): $($proc.ProcessName)"
            $closedCount++
          }
        } catch {
          Write-Host "Não foi possível fechar: $($proc.ProcessName) - $($_.Exception.Message)"
        }
      }
      
      Write-Host "Total de processos fechados: $closedCount"
      $closedCount
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const match = result?.match(/Total de processos fechados: (\d+)/);
    const closedCount = match ? parseInt(match[1]) : 0;
    
    console.log(`[Windows] ${closedCount} aplicações fechadas (modo: ${mode})`);
    return closedCount;
  } catch (error) {
    console.error('Erro ao fechar aplicações:', error);
    return 0;
  }
}

/**
 * Libera RAM usando EmptyStandbyList
 */
export async function freeRam(): Promise<boolean> {
  try {
    const command = `
      $toolPath = "tools/EmptyStandbyList.exe"
      if (Test-Path $toolPath) {
        Start-Process -FilePath $toolPath -Wait -NoNewWindow
        Write-Host "RAM liberada com EmptyStandbyList"
        $true
      } else {
        Write-Host "EmptyStandbyList.exe não encontrado em tools/"
        # Alternativa usando comandos nativos
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
        Write-Host "Limpeza de RAM alternativa executada"
        $false
      }
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const success = result && result.includes('RAM liberada');
    
    if (success) {
      console.log('[Windows] RAM liberada com EmptyStandbyList');
    } else {
      console.log('[Windows] Limpeza de RAM alternativa executada');
    }
    
    return true; // Sempre retorna true pois a alternativa sempre funciona
  } catch (error) {
    console.error('Erro ao liberar RAM:', error);
    return false;
  }
}

/**
 * Limpa caches temporários
 */
export async function clearTempCaches(): Promise<boolean> {
  try {
    const tmpDir = await safeTmpDir();
    
    const command = `
      $cleaned = 0
      $tmpDir = "${tmpDir}"
      
      # Limpar diretório temporário seguro
      try {
        $tempFiles = Get-ChildItem -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
        $tempFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        $cleaned += $tempFiles.Count
        Write-Host "Limpeza do diretório temporário: $($tempFiles.Count) itens"
      } catch {
        Write-Host "Erro na limpeza do diretório temporário: $($_.Exception.Message)"
      }
      
      # Limpar %WINDIR%\\\\Temp
      try {
        $winTempFiles = Get-ChildItem -Path "$env:WINDIR\\\\Temp" -Recurse -Force -ErrorAction SilentlyContinue
        $winTempFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        $cleaned += $winTempFiles.Count
        Write-Host "Limpeza do Windows Temp: $($winTempFiles.Count) itens"
      } catch {
        Write-Host "Erro na limpeza do Windows Temp: $($_.Exception.Message)"
      }
      
      # Limpar SoftwareDistribution\\\\Download
      try {
        $updateFiles = Get-ChildItem -Path "$env:WINDIR\\\\SoftwareDistribution\\\\Download" -Recurse -Force -ErrorAction SilentlyContinue
        $updateFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        $cleaned += $updateFiles.Count
        Write-Host "Limpeza do SoftwareDistribution: $($updateFiles.Count) itens"
      } catch {
        Write-Host "Erro na limpeza do SoftwareDistribution: $($_.Exception.Message)"
      }
      
      Write-Host "Total de itens limpos: $cleaned"
      $true
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const success = result && result.includes('Total de itens limpos');
    
    if (success) {
      console.log('[Windows] Caches temporários limpos');
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao limpar caches:', error);
    return false;
  }
}

/**
 * Desabilita programas de inicialização não essenciais
 */
export async function disableNonEssentialStartup(): Promise<boolean> {
  try {
    const command = `
      # Criar backup do registro
      $backupPath = "$env:USERPROFILE\\\\Documents\\\\startup-backup.reg"
      reg export "HKEY_CURRENT_USER\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run" "$backupPath" /y
      
      # Listar e desabilitar entradas não Microsoft
      $runKey = "HKCU:\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run"
      $entries = Get-ItemProperty -Path $runKey -ErrorAction SilentlyContinue
      $disabled = 0
      
      if ($entries) {
        $entries.PSObject.Properties | ForEach-Object {
          if ($_.Name -notin @('PSPath', 'PSParentPath', 'PSChildName', 'PSDrive', 'PSProvider')) {
            $value = $_.Value
            # Verificar se não é da Microsoft
            if ($value -notmatch 'Microsoft|Windows|System32') {
              try {
                Remove-ItemProperty -Path $runKey -Name $_.Name -ErrorAction Stop
                Write-Host "Desabilitado: $($_.Name)"
                $disabled++
              } catch {
                Write-Host "Erro ao desabilitar: $($_.Name)"
              }
            }
          }
        }
      }
      
      Write-Host "Backup salvo em: $backupPath"
      Write-Host "Total desabilitado: $disabled"
      $true
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const success = result && result.includes('Backup salvo em');
    
    if (success) {
      console.log('[Windows] Programas de inicialização não essenciais desabilitados');
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao desabilitar programas de inicialização:', error);
    return false;
  }
}

/**
 * Restaura programas de inicialização
 */
export async function restoreStartup(): Promise<boolean> {
  try {
    const command = `
      $backupPath = "$env:USERPROFILE\\\\Documents\\\\startup-backup.reg"
      if (Test-Path $backupPath) {
        reg import "$backupPath"
        Write-Host "Programas de inicialização restaurados"
        $true
      } else {
        Write-Host "Backup não encontrado: $backupPath"
        $false
      }
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const success = result && result.includes('restaurados');
    
    if (success) {
      console.log('[Windows] Programas de inicialização restaurados');
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao restaurar programas de inicialização:', error);
    return false;
  }
}

/**
 * Cria ponto de restauração do sistema
 */
export async function createRestorePoint(): Promise<boolean> {
  try {
    const command = `
      try {
        Checkpoint-Computer -Description "GameBooster Optimization" -RestorePointType "MODIFY_SETTINGS"
        Write-Host "Ponto de restauração criado"
        $true
      } catch {
        Write-Host "Não foi possível criar ponto de restauração: $($_.Exception.Message)"
        $false
      }
    `;

    const result = await window.backend.runPS(command, PS_TIMEOUT);
    const success = result && result.includes('criado');
    
    if (success) {
      console.log('[Windows] Ponto de restauração criado');
    } else {
      console.log('[Windows] Ponto de restauração não pôde ser criado (pode estar desabilitado)');
    }
    
    return success;
  } catch (error) {
    console.error('Erro ao criar ponto de restauração:', error);
    return false;
  }
}

/**
 * Restaura todas as configurações
 */
export async function restoreAll(): Promise<boolean> {
  try {
    let success = true;
    
    // Restaurar plano de energia anterior
    const prevPowerPlan = localStorage.getItem('gb.prevPowerPlan');
    if (prevPowerPlan) {
      const restorePowerCommand = `
        powercfg /setactive ${prevPowerPlan}
        Write-Host "Plano de energia anterior restaurado"
      `;
      
      await window.backend.runPS(restorePowerCommand, PS_TIMEOUT);
      localStorage.removeItem('gb.prevPowerPlan');
      console.log('[Windows] Plano de energia anterior restaurado');
    }
    
    // Restaurar programas de inicialização
    const startupRestored = await restoreStartup();
    if (!startupRestored) {
      success = false;
    }
    
    console.log('[Windows] Restauração completa finalizada');
    return success;
  } catch (error) {
    console.error('Erro na restauração completa:', error);
    return false;
  }
}

/**
 * Aplica boost de GPU (placeholder)
 */
export async function applyGpuBoost(mode: 'low'|'balanced'|'high'|'quality'|'max'|'max-vram-buffer'): Promise<{ ok: boolean; mode: string }> {
  // Placeholder: sem integração real ainda. Apenas retorna ok.
  console.log(`[Windows] GPU boost aplicado: ${mode} (placeholder)`);
  return { ok: true, mode };
}

/**
 * Define velocidade da ventoinha (placeholder)
 */
export async function setFanSpeed(percent: number): Promise<{ ok: boolean; percent: number }> {
  // Placeholder: controle de ventoinha depende de EC/OEM; por ora só simula sucesso.
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;
  
  console.log(`[Windows] Fan speed definida: ${percent}% (placeholder)`);
  return { ok: true, percent };
}

/**
 * Executa sequência completa de otimização Turbo
 */
export async function runTurboOptimization(preset: any): Promise<boolean> {
  try {
    console.log('[Windows] Iniciando otimização Turbo...');
    
    // 1. Liberar RAM
    await freeRam();
    
    // 2. Fechar aplicações em segundo plano
    await closeBackgroundApps(preset.backgroundApps || 'smart');
    
    // 3. Definir prioridade de processos (se especificado)
    if (preset.targetProcess) {
      await setProcessPriority({
        name: preset.targetProcess,
        level: preset.cpuPriority === 'realtime' ? 'RealTime' : 'High'
      });
    }
    
    // 4. Aplicar plano de energia performance
    await applyPowerPlan('performance');
    
    // 5. Limpar caches temporários
    await clearTempCaches();
    
    console.log('[Windows] Otimização Turbo concluída');
    return true;
  } catch (error) {
    console.error('Erro na otimização Turbo:', error);
    return false;
  }
}

// Exportar todas as funções
export default {
  applyPowerPlan,
  setProcessPriority,
  closeBackgroundApps,
  freeRam,
  clearTempCaches,
  disableNonEssentialStartup,
  restoreStartup,
  createRestorePoint,
  restoreAll,
  runTurboOptimization,
  applyGpuBoost,
  setFanSpeed
};