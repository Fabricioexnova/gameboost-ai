/**
 * PowerShell Utility - Integração com Backend Node.js
 * Fornece interface para executar comandos PowerShell com segurança
 */

import { log } from '../lib/logger'
import { safeTmpDir } from '../engine/util/tmpdir'

// Tipos para resultados PowerShell
export interface PowerShellResult {
  stdout: string
  stderr: string
  code: number
  duration: number
}

export interface FileReadResult {
  success: boolean
  content?: string
  error?: string
}

export interface EnvironmentInfo {
  isDesktop: boolean
  isAdmin: boolean
  platform: string
  arch: string
  version: string
}

/**
 * Classe para gerenciar operações PowerShell
 */
export class PowerShellManager {
  private static instance: PowerShellManager
  private isElectron: boolean = false
  private envInfo: EnvironmentInfo | null = null

  constructor() {
    // Verificar se está rodando no Electron
    this.isElectron = typeof window !== 'undefined' && 
                     typeof (window as any).backend !== 'undefined'
  }

  static getInstance(): PowerShellManager {
    if (!PowerShellManager.instance) {
      PowerShellManager.instance = new PowerShellManager()
    }
    return PowerShellManager.instance
  }

  /**
   * Obter informações do ambiente
   */
  async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    if (this.envInfo) {
      return this.envInfo
    }

    if (this.isElectron && (window as any).env) {
      try {
        this.envInfo = await (window as any).env.getInfo()
        return this.envInfo
      } catch (error) {
        log(`Erro ao obter informações do ambiente: ${error}`, 'error')
      }
    }

    // Fallback para ambiente web
    this.envInfo = {
      isDesktop: false,
      isAdmin: false,
      platform: 'web',
      arch: 'unknown',
      version: '0.0.0'
    }

    return this.envInfo
  }

  /**
   * Executar comando PowerShell
   */
  async runPS(command: string, timeout: number = 30000): Promise<PowerShellResult> {
    const startTime = Date.now()
    
    // Log do comando
    log(`Executando PowerShell: ${command.slice(0, 50)}${command.length > 50 ? '...' : ''}`, 'info')

    if (!this.isElectron || !(window as any).backend) {
      // Simular execução em ambiente web
      log('Simulando comando PowerShell (ambiente web)', 'info')
      
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800))
      
      return {
        stdout: `Comando simulado: ${command}`,
        stderr: '',
        code: 0,
        duration: Date.now() - startTime
      }
    }

    try {
      const result = await (window as any).backend.runPS(command, timeout)
      
      // Log do resultado
      const status = result.code === 0 ? 'OK' : 'ERRO'
      log(`PowerShell ${status} (${result.duration}ms)`, result.code === 0 ? 'success' : 'error')
      
      return result
      
    } catch (error) {
      log(`Erro no PowerShell: ${error}`, 'error')
      
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Erro desconhecido',
        code: 1,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Ler arquivo do sistema
   */
  async readFile(filePath: string): Promise<FileReadResult> {
    log(`Lendo arquivo: ${filePath}`, 'info')

    if (!this.isElectron || !(window as any).backend) {
      // Simular leitura em ambiente web
      log('Simulando leitura de arquivo (ambiente web)', 'info')
      
      return {
        success: false,
        error: 'Leitura de arquivos não disponível em ambiente web'
      }
    }

    try {
      const result = await (window as any).backend.readFile(filePath)
      
      if (result.success) {
        log(`Arquivo lido com sucesso: ${result.content?.length || 0} caracteres`, 'success')
      } else {
        log(`Erro ao ler arquivo: ${result.error}`, 'error')
      }
      
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      log(`Erro na leitura: ${errorMessage}`, 'error')
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Solicitar elevação de privilégios
   */
  async requestElevation(): Promise<{ success: boolean; message: string }> {
    log('Solicitando elevação de privilégios', 'info')

    if (!this.isElectron || !(window as any).backend) {
      return {
        success: false,
        message: 'Elevação não disponível em ambiente web'
      }
    }

    try {
      const result = await (window as any).backend.requestElevation()
      
      if (result.success) {
        log('Elevação solicitada com sucesso', 'success')
      } else {
        log(`Falha na elevação: ${result.message}`, 'error')
      }
      
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      log(`Erro na elevação: ${errorMessage}`, 'error')
      
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  /**
   * Comandos PowerShell pré-definidos para otimização
   */
  async optimizeSystem(): Promise<PowerShellResult[]> {
    const commands = [
      'Get-Process | Where-Object {$_.WorkingSet -gt 100MB} | Select-Object Name, WorkingSet',
      'Get-WmiObject -Class Win32_PerfRawData_PerfOS_Memory | Select-Object AvailableBytes',
      'Get-Counter "\\Processor(_Total)\\% Processor Time" -SampleInterval 1 -MaxSamples 1',
      'Get-WmiObject -Class Win32_VideoController | Select-Object Name, AdapterRAM'
    ]

    const results: PowerShellResult[] = []
    
    for (const command of commands) {
      const result = await this.runPS(command, 10000)
      results.push(result)
      
      // Pequeno delay entre comandos
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Limpar cache do sistema
   */
  async clearSystemCache(): Promise<PowerShellResult> {
    const tmpDir = await safeTmpDir()
    
    const command = `
      # Limpar cache DNS
      Clear-DnsClientCache
      
      # Limpar arquivos temporários (seguro)
      Get-ChildItem -Path "${tmpDir}" -Recurse -Force -ErrorAction SilentlyContinue | 
      Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | 
      Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
      
      Write-Output "Cache do sistema limpo"
    `
    
    return await this.runPS(command, 30000)
  }

  /**
   * Otimizar configurações de rede para gaming
   */
  async optimizeNetworkForGaming(): Promise<PowerShellResult> {
    const command = `
      # Otimizar configurações TCP para gaming
      netsh int tcp set global autotuninglevel=normal
      netsh int tcp set global rss=enabled
      netsh int tcp set global netdma=enabled
      
      Write-Output "Configurações de rede otimizadas para gaming"
    `
    
    return await this.runPS(command, 15000)
  }

  /**
   * Verificar temperatura do sistema
   */
  async checkSystemTemperature(): Promise<PowerShellResult> {
    const command = `
      Get-WmiObject -Namespace "root/OpenHardwareMonitor" -Class Sensor | 
      Where-Object { $_.SensorType -eq "Temperature" } | 
      Select-Object Name, Value | 
      Format-Table -AutoSize
    `
    
    return await this.runPS(command, 10000)
  }
}

// Instância singleton
export const powerShell = PowerShellManager.getInstance()

// Funções de conveniência
export const runPS = (command: string, timeout?: number) => powerShell.runPS(command, timeout)
export const readFile = (filePath: string) => powerShell.readFile(filePath)
export const requestElevation = () => powerShell.requestElevation()
export const getEnvironmentInfo = () => powerShell.getEnvironmentInfo()