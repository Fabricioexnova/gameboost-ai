/**
 * GameBoost AI - Hooks para Integração com UI
 * Conecta o engine de otimização com a interface React
 */

import { useState, useEffect, useCallback } from 'react'
import { gameBoostOptimizer, type ProcessInfo, type SystemMetrics, type OptimizationResult } from './optimizer'
import { initEngine, getSystemSnapshot, performOptimization, type SystemSnapshot } from './engineMock'
import { presets, profileNameMap, presetDisplayNames, type PresetConfig } from './presets'
import { runTurbo, startSession, endSession, getCurrentSession, getActiveTelemetryBoost, getLastTurboData, type TurboResult } from './turbo'
import { logger, log } from '../lib/logger'

/**
 * Hook principal para gerenciar o engine do GameBoost AI
 */
export function useEngine() {
  const [initializing, setInitializing] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)

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

  return {
    initializing,
    ready,
    error,
    snapshot,
    init,
    updateSnapshot
  }
}

/**
 * Hook para gerenciar perfis de otimização
 */
export function useProfiles() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // Carregar perfil salvo ao inicializar
  useEffect(() => {
    const savedProfile = localStorage.getItem('gb.profile')
    if (savedProfile && presets[savedProfile]) {
      setActiveProfile(savedProfile)
      log(`Perfil salvo carregado: ${presetDisplayNames[savedProfile] || savedProfile}`, 'info')
    }
  }, [])

  // Função para aplicar preset com mapeamento correto
  const applyPreset = useCallback(async (profileIdentifier: string): Promise<{ success: boolean; message: string }> => {
    setApplying(true)
    
    try {
      // Garantir que estamos usando o identificador correto
      let presetKey = profileIdentifier
      
      // Se recebeu um nome de display, mapear para a chave correta
      if (profileNameMap[profileIdentifier]) {
        presetKey = profileNameMap[profileIdentifier]
      }
      
      // Normalizar identificador (remover espaços, acentos, hífens)
      presetKey = presetKey.toLowerCase().replace(/[\s\-]+/g, '')
      
      const preset = presets[presetKey]
      
      if (!preset) {
        throw new Error(`Preset '${profileIdentifier}' não encontrado`)
      }

      // Obter nome de display para logs
      const displayName = presetDisplayNames[presetKey] || profileIdentifier

      // Log do início da aplicação
      const formatTime = () => new Date().toTimeString().slice(0, 8)
      log(`[${formatTime()}] Perfil aplicado: ${displayName}`, 'success')

      // Simular aplicação das configurações do preset com logs detalhados
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

      // Salvar perfil ativo usando a chave correta
      setActiveProfile(presetKey)
      localStorage.setItem('gb.profile', presetKey)

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

  // Função genérica para executar otimizações com feedback
  const executeOptimization = useCallback(async (type: string, originalFn: () => Promise<OptimizationResult>) => {
    setIsOptimizing(true)
    log(`Iniciando: ${type}`, 'info')
    
    try {
      // Usar mock para feedback visual
      const mockResult = await performOptimization(type)
      
      // Executar função real em paralelo (se disponível)
      let realResult: OptimizationResult
      try {
        realResult = await originalFn()
      } catch {
        // Fallback para resultado mock se função real falhar
        realResult = {
          success: mockResult.success,
          message: mockResult.message,
          details: `${type} executado via simulação`
        }
      }
      
      setLastOptimization(realResult)
      log(`${type}: ${realResult.success ? 'Sucesso' : 'Falha'}`, realResult.success ? 'success' : 'error')
      
      return realResult
      
    } finally {
      setIsOptimizing(false)
    }
  }, [])

  // Função para liberar CPU/RAM
  const optimizeCpuRam = useCallback(async () => {
    return executeOptimization('Limpeza de CPU/RAM', () => gameBoostOptimizer.optimizeCpuRam())
  }, [executeOptimization])

  // Função para boost de prioridade de jogo
  const boostGamePriority = useCallback(async () => {
    return executeOptimization('Boost de Prioridade', () => gameBoostOptimizer.boostGamePriority())
  }, [executeOptimization])

  // Função para limpeza de cache
  const clearSystemCache = useCallback(async () => {
    return executeOptimization('Limpeza de Cache', () => gameBoostOptimizer.clearSystemCache())
  }, [executeOptimization])

  // Função para aplicar plano de energia
  const applyMaxPerformancePowerPlan = useCallback(async () => {
    return executeOptimization('Plano de Energia', () => gameBoostOptimizer.applyMaxPerformancePowerPlan())
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