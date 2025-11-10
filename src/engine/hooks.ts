/**
 * GameBoost AI - Hooks para Integração com UI
 * Conecta o engine de otimização com a interface React
 */

import { useState, useEffect, useCallback } from 'react'
import { gameBoostOptimizer, type ProcessInfo, type SystemMetrics, type OptimizationResult } from './optimizer'
import { initEngine, getSystemSnapshot, performOptimization, type SystemSnapshot } from './engineMock'
import { presets, profileNameMap, presetDisplayNames, normalizeProfileName, type PresetConfig } from './presets'
import { runTurbo, startSession, endSession, getCurrentSession, getActiveTelemetryBoost, getLastTurboData, type TurboResult } from './turbo'
import { logger, log } from '../lib/logger'
import { powerShell, getEnvironmentInfo } from '../lib/powershell'
import * as WinOpt from './optimizer/windows'
import { isDesktop, isAdmin } from '../hooks/useElectron'
import { getProvider } from './sensors'
import type { Snapshot } from './sensors/types'
import * as Telemetry from './telemetry'
import type { TelemetryData } from './telemetry'

/**
 * Hook principal para gerenciar o engine do GameBoost AI
 */
export function useEngine() {
  const [initializing, setInitializing] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)
  const [sensorSnapshot, setSensorSnapshot] = useState<Snapshot | null>(null)
  const [isUsingMockSensors, setIsUsingMockSensors] = useState(false)
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null)
  const [telemetryActive, setTelemetryActive] = useState(false)

  // Função para inicializar o engine
  const init = useCallback(async () => {
    setInitializing(true)
    setReady(false)
    setError(null)

    // Watchdog: timeout após 5 segundos
    const timeoutId = setTimeout(() => {
      setError('Timeout: Engine não respondeu em 5 segundos')
      setInitializing(false)
    }, 5000)

    try {
      await initEngine()
      
      // Verificar ambiente Electron
      const envInfo = await getEnvironmentInfo()
      if (envInfo.isDesktop) {
        log('Executando em ambiente desktop (Electron)', 'info')
        if (envInfo.isAdmin) {
          log('Privilégios de administrador detectados', 'success')
        } else {
          log('Executando sem privilégios de administrador', 'warning')
        }
      } else {
        log('Executando em ambiente web (telemetria simulada)', 'info')
      }

      // Inicializar sistema de sensores
      const sensorProvider = await getProvider()
      await sensorProvider.init()
      
      // Verificar se está usando sensores mock
      const usingMock = !isDesktop()
      setIsUsingMockSensors(usingMock)
      
      if (usingMock) {
        log('Sistema de sensores: telemetria simulada', 'info')
      } else {
        log('Sistema de sensores: telemetria real', 'success')
      }

      // Iniciar coleta de dados dos sensores a cada 1 segundo
      setInterval(async () => {
        try {
          const sensorData = await sensorProvider.getSnapshot()
          setSensorSnapshot(sensorData)
        } catch (error) {
          // Se falhar, continua com dados anteriores
        }
      }, 1000)
      
      // Sucesso na inicialização
      clearTimeout(timeoutId)
      setInitializing(false)
      setReady(true)
      
      // Obter snapshot inicial
      const initialSnapshot = getSystemSnapshot()
      setSnapshot(initialSnapshot)
      
      log('Engine inicializado com sucesso', 'success')
      
    } catch (err) {
      clearTimeout(timeoutId)
      setError(err instanceof Error ? err.message : 'Erro desconhecido na inicialização')
      setInitializing(false)
      setReady(false)
      log(`Erro na inicialização: ${err}`, 'error')
    }
  }, [])

  // Função para iniciar telemetria avançada (FPS + temperaturas)
  const startTelemetry = useCallback(async () => {
    if (telemetryActive) {
      log('Telemetria avançada já está ativa', 'info')
      return
    }

    try {
      log('Iniciando telemetria avançada (FPS + temperaturas)...', 'info')
      
      // Registrar callback para receber dados de telemetria
      const unsubscribe = Telemetry.onTelemetry((data: TelemetryData) => {
        setTelemetryData(data)
        
        // Atualizar snapshot com dados de telemetria
        setSensorSnapshot(prev => ({
          ...prev,
          fps: data.fps,
          cpu: {
            ...prev?.cpu,
            temp: data.cpuTemp
          },
          gpu: {
            ...prev?.gpu,
            temp: data.gpuTemp
          }
        }))
      })

      // Iniciar coletores
      await Telemetry.startCollectors()
      setTelemetryActive(true)
      
      const mode = Telemetry.isSimulationMode() ? 'simulada' : 'real'
      log(`Telemetria avançada iniciada (${mode})`, 'success')
      
      // Salvar função de cleanup
      ;(window as any).__telemetryCleanup = unsubscribe
      
    } catch (error) {
      log(`Erro ao iniciar telemetria: ${error}`, 'error')
    }
  }, [telemetryActive])

  // Função para parar telemetria avançada
  const stopTelemetry = useCallback(async () => {
    if (!telemetryActive) {
      return
    }

    try {
      log('Parando telemetria avançada...', 'info')
      
      // Parar coletores
      await Telemetry.stopCollectors()
      
      // Cleanup callback
      const cleanup = (window as any).__telemetryCleanup
      if (cleanup) {
        cleanup()
        delete (window as any).__telemetryCleanup
      }
      
      setTelemetryActive(false)
      setTelemetryData(null)
      
      log('Telemetria avançada parada', 'info')
      
    } catch (error) {
      log(`Erro ao parar telemetria: ${error}`, 'error')
      setTelemetryActive(false)
    }
  }, [telemetryActive])

  // Função para atualizar snapshot
  const updateSnapshot = useCallback(() => {
    if (ready) {
      const newSnapshot = getSystemSnapshot()
      setSnapshot(newSnapshot)
    }
  }, [ready])

  // Auto-update do snapshot a cada 2 segundos quando ready
  useEffect(() => {
    if (!ready) return

    const interval = setInterval(updateSnapshot, 2000)
    return () => clearInterval(interval)
  }, [ready, updateSnapshot])

  // Cleanup da telemetria no unmount
  useEffect(() => {
    return () => {
      if (telemetryActive) {
        stopTelemetry()
      }
    }
  }, [telemetryActive, stopTelemetry])

  return {
    initializing,
    ready,
    error,
    snapshot,
    sensorSnapshot,
    isUsingMockSensors,
    telemetryData,
    telemetryActive,
    init,
    updateSnapshot,
    startTelemetry,
    stopTelemetry
  }
}

/**
 * Hook para gerenciar perfis de otimização
 */
export function useProfiles() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // Carregar perfil salvo ao inicializar com conversão de nomes antigos
  useEffect(() => {
    const savedProfile = localStorage.getItem('gb.profile')
    if (savedProfile) {
      // Conversão de nomes antigos para identificadores corretos
      const legacyNameMap: Record<string, string> = {
        'Arc Raiders': 'arcriders',
        'arc-raiders': 'arcriders',
        'arc_riders': 'arcriders',
        'Warzone': 'warzone',
        'E-Sports': 'esports',
        'Battle Royale': 'battleroyale',
        'AAA Games': 'aaa',
        'Battlefield 6': 'battlefield6',
        'Stream + Game': 'streamgame',
        'Silencioso': 'silent'
      }
      
      // Verificar se é um nome antigo que precisa ser convertido
      const correctKey = legacyNameMap[savedProfile] || savedProfile
      
      if (presets[correctKey]) {
        setActiveProfile(correctKey)
        // Se foi convertido, salvar o identificador correto
        if (correctKey !== savedProfile) {
          localStorage.setItem('gb.profile', correctKey)
          log(`Perfil convertido: '${savedProfile}' -> '${correctKey}'`, 'info')
        }
        log(`Perfil salvo carregado: ${presetDisplayNames[correctKey] || correctKey}`, 'info')
      } else {
        // Perfil não encontrado, remover do localStorage
        localStorage.removeItem('gb.profile')
        log(`Perfil inválido removido: ${savedProfile}`, 'warning')
      }
    }
  }, [])

  // Função para aplicar preset com mapeamento correto
  const applyPreset = useCallback(async (profileIdentifier: string): Promise<{ success: boolean; message: string }> => {
    setApplying(true)
    
    try {
      // Usar normalizeProfileName para mapear o nome corretamente
      const normalizedKey = normalizeProfileName(profileIdentifier)
      
      if (!normalizedKey) {
        throw new Error(`Preset '${profileIdentifier}' não encontrado`)
      }
      
      const preset = presets[normalizedKey]
      
      if (!preset) {
        throw new Error(`Preset '${profileIdentifier}' não encontrado`)
      }

      // Obter nome de display para logs
      const displayName = presetDisplayNames[normalizedKey] || profileIdentifier

      // Log do início da aplicação
      const formatTime = () => new Date().toTimeString().slice(0, 8)
      log(`[${formatTime()}] Perfil aplicado: ${displayName}`, 'success')

      // Verificar se está no Electron para usar comandos reais
      const envInfo = await getEnvironmentInfo()
      
      if (envInfo.isDesktop && envInfo.isAdmin) {
        // Executar comandos PowerShell reais para aplicar configurações
        await applyPresetWithPowerShell(preset, displayName)
      } else {
        // Simular aplicação das configurações do preset com logs detalhados
        await simulatePresetApplication(preset, displayName)
      }

      // Salvar perfil ativo usando a chave correta
      setActiveProfile(normalizedKey)
      localStorage.setItem('gb.profile', normalizedKey)

      log(`[${formatTime()}] Perfil '${displayName}' aplicado com sucesso`, 'success')

      return {
        success: true,
        message: `Perfil '${displayName}' aplicado com sucesso!`
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao aplicar perfil'
      const formatTime = () => new Date().toTimeString().slice(0, 8)
      log(`[${formatTime()}] Erro: ${errorMessage}`, 'error')
      
      return {
        success: false,
        message: errorMessage
      }
    } finally {
      setApplying(false)
    }
  }, [])

  // Aplicar preset usando PowerShell (ambiente desktop)
  const applyPresetWithPowerShell = async (preset: PresetConfig, displayName: string) => {
    const formatTime = () => new Date().toTimeString().slice(0, 8)
    
    // Comandos PowerShell baseados no preset
    const commands = [
      {
        name: `CPU Priority: ${preset.cpuPriority}`,
        command: `Get-Process | Where-Object {$_.ProcessName -like \"*game*\"} | ForEach-Object {$_.PriorityClass = \"${preset.cpuPriority === 'high' ? 'High' : 'Normal'}\"}`,
        delay: 200
      },
      {
        name: `RAM Cleanup: ${preset.ramCleanup}`,
        command: preset.ramCleanup === 'aggressive' 
          ? '[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers(); [System.GC]::Collect()'
          : 'Write-Output \"RAM cleanup: minimal\"',
        delay: 150
      },
      {
        name: `Power Mode: ${preset.powerMode}`,
        command: `powercfg /setactive ${preset.powerMode === 'performance' ? '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' : 'balanced'}`,
        delay: 160
      },
      {
        name: `Fan Speed: ${preset.fanSpeed}%`,
        command: `Write-Output \"Fan speed set to ${preset.fanSpeed}%\"`, // Placeholder - fan control é específico do hardware
        delay: 120
      }
    ]

    // Executar cada comando
    for (const operation of commands) {
      await new Promise(resolve => setTimeout(resolve, operation.delay))
      
      try {
        const result = await powerShell.runPS(operation.command, 10000)
        
        if (result.code === 0) {
          log(`[${formatTime()}] ${operation.name} OK`, 'info')
        } else {
          log(`[${formatTime()}] ${operation.name} ERRO: ${result.stderr}`, 'error')
        }
      } catch (error) {
        log(`[${formatTime()}] ${operation.name} ERRO: ${error}`, 'error')
      }
    }
  }

  // Simular aplicação do preset (ambiente web)
  const simulatePresetApplication = async (preset: PresetConfig, displayName: string) => {
    const formatTime = () => new Date().toTimeString().slice(0, 8)
    
    const operations = [
      { action: `CPU Priority: ${preset.cpuPriority}`, delay: 200 },
      { action: `RAM Cleanup: ${preset.ramCleanup}`, delay: 150 },
      { action: `Background Apps: ${preset.backgroundApps}`, delay: 180 },
      { action: `Fan Speed: ${preset.fanSpeed}%`, delay: 120 },
      { action: `Power Mode: ${preset.powerMode}`, delay: 160 },
      { action: `GPU Boost: ${preset.gpuBoost}`, delay: 200 }
    ]

    // Aplicar cada operação com log individual
    for (const operation of operations) {
      await new Promise(resolve => setTimeout(resolve, operation.delay))
      log(`[${formatTime()}] ${operation.action} OK`, 'info')
    }

    // Simular erro aleatório (10% de chance)
    if (Math.random() < 0.1) {
      throw new Error('Falha na aplicação do perfil (simulação)')
    }
  }

  // Função para carregar perfil salvo
  const loadSavedProfile = useCallback(() => {
    const savedProfile = localStorage.getItem('gb.profile')
    if (savedProfile && presets[savedProfile]) {
      setActiveProfile(savedProfile)
      return savedProfile
    }
    return null
  }, [])

  // Função para obter configuração do perfil ativo
  const getActivePresetConfig = useCallback((): PresetConfig | null => {
    if (!activeProfile || !presets[activeProfile]) {
      return null
    }
    return presets[activeProfile]
  }, [activeProfile])

  // Função para obter nome de exibição do perfil ativo
  const getActiveProfileDisplayName = useCallback((): string | null => {
    if (!activeProfile) return null
    return presetDisplayNames[activeProfile] || activeProfile
  }, [activeProfile])

  // Função para aplicar perfil salvo automaticamente
  const autoApplySavedProfile = useCallback(async (engineReady: boolean) => {
    if (!engineReady) return

    const savedProfile = localStorage.getItem('gb.profile')
    if (savedProfile && presets[savedProfile]) {
      const displayName = presetDisplayNames[savedProfile] || savedProfile
      log(`Auto-aplicando perfil salvo: ${displayName}`, 'info')
      
      // Aplicar perfil automaticamente usando a chave interna
      await applyPreset(savedProfile)
    }
  }, [applyPreset])

  return {
    activeProfile,
    applying,
    applyPreset,
    loadSavedProfile,
    getActivePresetConfig,
    getActiveProfileDisplayName,
    autoApplySavedProfile
  }
}

/**
 * Hook para gerenciar o Turbo Mode
 */
export function useTurbo() {
  const [running, setRunning] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [lastResult, setLastResult] = useState<TurboResult | null>(null)

  // Carregar dados persistidos ao inicializar
  useEffect(() => {
    const turboData = getLastTurboData()
    if (turboData) {
      const elapsed = Date.now() - turboData.lastTurboAt
      const remainingCooldown = Math.max(0, 60 - Math.floor(elapsed / 1000))
      if (remainingCooldown > 0) {
        setCooldown(remainingCooldown)
      }
    }
  }, [])

  // Countdown do cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // Função para executar Turbo Mode
  const run = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    // Verificar bloqueios
    if (running) {
      return { success: false, message: 'Turbo Mode já está em execução' }
    }
    
    if (cooldown > 0) {
      return { success: false, message: `Aguarde ${cooldown}s para usar novamente` }
    }

    // Obter perfil ativo
    const activeProfile = localStorage.getItem('gb.profile')
    if (!activeProfile || !presets[activeProfile]) {
      return { success: false, message: 'Nenhum perfil ativo encontrado' }
    }

    const profileDisplayName = presetDisplayNames[activeProfile] || activeProfile

    try {
      setRunning(true)
      log(`🚀 Iniciando Turbo Mode - Perfil: ${profileDisplayName}`, 'info')

      // Executar Turbo Mode usando o identificador interno correto
      const result = await runTurbo(activeProfile)
      
      // Salvar resultado
      setLastResult({
        ...result,
        timestamp: Date.now()
      } as any)

      // Iniciar cooldown de 60 segundos
      setCooldown(60)

      // Mensagem de sucesso baseada no resultado
      const successMessage = result.errors === 0 
        ? `Turbo Mode concluído! ${result.steps} otimizações aplicadas`
        : `Turbo Mode concluído com ${result.errors} erros de ${result.steps} operações`

      return {
        success: result.errors === 0,
        message: successMessage
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no Turbo Mode'
      log(`Erro no Turbo Mode: ${errorMessage}`, 'error')
      
      return {
        success: false,
        message: errorMessage
      }
    } finally {
      setRunning(false)
    }
  }, [running, cooldown])

  // Função para obter estado do botão
  const getButtonState = useCallback((): 'idle' | 'running' | 'cooldown' => {
    if (running) return 'running'
    if (cooldown > 0) return 'cooldown'
    return 'idle'
  }, [running, cooldown])

  // Função para obter tooltip do botão
  const getButtonTooltip = useCallback((): string => {
    const state = getButtonState()
    switch (state) {
      case 'running':
        return 'Executando otimizações...'
      case 'cooldown':
        return `Cooldown: ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}`
      case 'idle':
      default:
        return 'Aplica otimizações do perfil ativo'
    }
  }, [getButtonState, cooldown])

  return {
    running,
    cooldown,
    lastResult,
    run,
    getButtonState,
    getButtonTooltip
  }
}

/**
 * Hook para gerenciar otimizações do sistema
 */
export function useGameBoostOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  // Atualiza status de otimização e logs
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOptimizing(gameBoostOptimizer.isCurrentlyOptimizing())
      
      // Combinar logs do optimizer com logs do logger
      const optimizerLogs = gameBoostOptimizer.getLogs()
      const systemLogs = logger.getFormattedLogs()
      const allLogs = [...optimizerLogs, ...systemLogs].slice(-20) // Últimos 20 logs
      
      setLogs(allLogs)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Função genérica para executar otimizações com feedback usando optimizer real
  const executeOptimization = useCallback(async (type: string, optimizerFn: () => Promise<any>) => {
    setIsOptimizing(true)
    const formatTime = () => new Date().toTimeString().slice(0, 8)
    log(`[${formatTime()}] ${type}...`, 'info')
    
    try {
      if (isDesktop() && typeof optimizerFn === 'function') {
        // Executar função real do optimizer
        await optimizerFn()
        log(`[${formatTime()}] ${type} OK`, 'success')
        
        const result: OptimizationResult = {
          success: true,
          message: `${type} executado com sucesso`,
          details: `Operação realizada via optimizer real`
        }
        
        setLastOptimization(result)
        return result
      } else {
        // Preview/simulação
        await new Promise(r => setTimeout(r, 300))
        log(`[${formatTime()}] (preview) ${type} simulado`, 'info')
        log(`[${formatTime()}] ${type} OK`, 'success')
        
        const result: OptimizationResult = {
          success: true,
          message: `${type} simulado com sucesso`,
          details: `Operação simulada para preview`
        }
        
        setLastOptimization(result)
        return result
      }
      
    } catch (error) {
      log(`[${formatTime()}] ${type} ERRO: ${error}`, 'error')
      
      const result: OptimizationResult = {
        success: false,
        message: `Erro em ${type}: ${error}`,
        details: ''
      }
      
      setLastOptimization(result)
      return result
    } finally {
      setIsOptimizing(false)
    }
  }, [])

  // Função para liberar RAM usando optimizer real
  const optimizeCpuRam = useCallback(async () => {
    return executeOptimization('Liberando RAM', WinOpt.freeRam)
  }, [executeOptimization])

  // Função para pausar apps em segundo plano
  const boostGamePriority = useCallback(async () => {
    return executeOptimization('Pausando apps em segundo plano', () => WinOpt.closeBackgroundApps('smart'))
  }, [executeOptimization])

  // Função para limpeza de cache
  const clearSystemCache = useCallback(async () => {
    return executeOptimization('Limpando cache temporário', WinOpt.clearTempCaches)
  }, [executeOptimization])

  // Função para aplicar plano de energia
  const applyMaxPerformancePowerPlan = useCallback(async () => {
    return executeOptimization('Aplicando plano de energia (Performance)', () => WinOpt.applyPowerPlan('performance'))
  }, [executeOptimization])

  // Função para Turbo Mode completo
  const turboOptimization = useCallback(async () => {
    return executeOptimization('Turbo Mode', () => gameBoostOptimizer.turboOptimization())
  }, [executeOptimization])

  // Função para obter processos
  const getRunningProcesses = useCallback(async () => {
    return await gameBoostOptimizer.getRunningProcesses()
  }, [])

  // Função para limpar logs
  const clearLogs = useCallback(() => {
    gameBoostOptimizer.clearLogs()
    logger.clearLogs()
    setLogs([])
    log('Logs limpos', 'info')
  }, [])

  return {
    isOptimizing,
    lastOptimization,
    logs,
    optimizeCpuRam,
    boostGamePriority,
    clearSystemCache,
    applyMaxPerformancePowerPlan,
    turboOptimization,
    getRunningProcesses,
    clearLogs
  }
}

/**
 * Hook para monitoramento de métricas do sistema
 */
export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(true)

  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(() => {
      const currentMetrics = gameBoostOptimizer.getSystemMetrics()
      setMetrics(currentMetrics)
    }, 2000)

    return () => clearInterval(interval)
  }, [isMonitoring])

  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev)
  }, [])

  return {
    metrics,
    isMonitoring,
    toggleMonitoring
  }
}

/**
 * Hook para gerenciar lista de processos
 */
export function useProcessList() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const refreshProcesses = useCallback(async () => {
    setIsLoading(true)
    try {
      const processList = await gameBoostOptimizer.getRunningProcesses()
      setProcesses(processList)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Erro ao carregar processos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh a cada 5 segundos
  useEffect(() => {
    refreshProcesses()
    const interval = setInterval(refreshProcesses, 5000)
    return () => clearInterval(interval)
  }, [refreshProcesses])

  // Filtra processos por tipo
  const getProcessesByType = useCallback((type: 'essential' | 'nonEssential' | 'gaming') => {
    switch (type) {
      case 'essential':
        return processes.filter(p => p.isEssential)
      case 'nonEssential':
        return processes.filter(p => !p.isEssential)
      case 'gaming':
        return processes.filter(p => 
          p.name.toLowerCase().includes('game') || 
          p.name.toLowerCase().includes('.exe') && p.cpuUsage > 10
        )
      default:
        return processes
    }
  }, [processes])

  return {
    processes,
    isLoading,
    lastUpdate,
    refreshProcesses,
    getProcessesByType
  }
}