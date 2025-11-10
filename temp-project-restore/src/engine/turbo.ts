/**
 * GameBoost AI - Turbo Mode Engine
 * Sistema de otimização inteligente integrado ao perfil ativo
 */

import { presets, presetDisplayNames, type PresetConfig } from './presets'
import { log } from '../lib/logger'

export interface TurboResult {
  steps: number
  errors: number
  tempGuard: boolean
  executionTime: number
  profile: string
}

export interface TurboSession {
  id: string
  startTime: Date
  endTime?: Date
  profile: string
  active: boolean
}

export interface TelemetryBoost {
  fpsBoost: number
  ramReduction: number
  tempReduction: number
  duration: number
}

// Estado global da sessão
let currentSession: TurboSession | null = null

// Estado da telemetria
let activeTelemetry: TelemetryBoost | null = null
let telemetryStartTime: number = 0

/**
 * Simula delay realista para operações
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Gera delay aleatório entre min e max
 */
const randomDelay = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Simula chance de erro (10%)
 */
const shouldFail = () => Math.random() < 0.1

/**
 * Formatar timestamp para logs
 */
const formatTime = () => {
  const now = new Date()
  return now.toTimeString().slice(0, 8)
}

/**
 * Calcular boost de FPS baseado no perfil
 */
const calculateFpsBoost = (profileKey: string): number => {
  switch (profileKey) {
    case 'esports':
    case 'battleroyale':
      return 5
    case 'aaa':
      return 3
    case 'battlefield6':
      return 6
    case 'streamgame':
      return 4
    case 'silent':
      return 0
    default:
      return 4
  }
}

/**
 * Operações individuais do Turbo Mode
 */
const turboOperations = {
  async freeRam(): Promise<boolean> {
    await delay(randomDelay(200, 400))
    log(`[${formatTime()}] Liberando RAM...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] RAM cleanup ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] RAM cleanup OK`, 'success')
    return true
  },

  async closeBackgroundApps(behavior: string): Promise<boolean> {
    await delay(randomDelay(300, 500))
    log(`[${formatTime()}] Fechando apps (${behavior})...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] Background apps ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] Background apps OK`, 'success')
    return true
  },

  async setCpuPriority(priority: string): Promise<boolean> {
    await delay(randomDelay(250, 350))
    log(`[${formatTime()}] CPU priority (${priority})...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] CPU priority ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] CPU priority OK`, 'success')
    return true
  },

  async applyPowerPlan(powerMode: string): Promise<boolean> {
    await delay(randomDelay(200, 300))
    log(`[${formatTime()}] Power plan (${powerMode})...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] Power plan ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] Power plan OK`, 'success')
    return true
  },

  async setFanSpeed(fanSpeed: number, tempGuard: boolean): Promise<boolean> {
    await delay(randomDelay(150, 250))
    
    // Simular temperatura atual
    const currentTemp = Math.floor(Math.random() * 40) + 60 // 60-100°C
    
    if (tempGuard && currentTemp > 80) {
      log(`[${formatTime()}] TempGuard ativo! Temp: ${currentTemp}°C`, 'info')
      log(`[${formatTime()}] Fan speed (100%) OK`, 'success')
    } else {
      log(`[${formatTime()}] Fan speed (${fanSpeed}%)...`, 'info')
      
      if (shouldFail()) {
        log(`[${formatTime()}] Fan speed ERRO`, 'error')
        return false
      }
      
      log(`[${formatTime()}] Fan speed OK`, 'success')
    }
    
    return true
  },

  async applyGpuBoost(gpuBoost: string): Promise<boolean> {
    await delay(randomDelay(300, 450))
    log(`[${formatTime()}] GPU boost (${gpuBoost})...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] GPU boost ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] GPU boost OK`, 'success')
    return true
  },

  async cleanTempCaches(): Promise<boolean> {
    await delay(randomDelay(400, 600))
    log(`[${formatTime()}] Limpando cache...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] Cache cleanup ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] Cache cleanup OK`, 'success')
    return true
  },

  async networkBoostBasic(): Promise<boolean> {
    await delay(randomDelay(200, 300))
    log(`[${formatTime()}] Network boost...`, 'info')
    
    if (shouldFail()) {
      log(`[${formatTime()}] Network boost ERRO`, 'error')
      return false
    }
    
    log(`[${formatTime()}] Network boost OK`, 'success')
    return true
  }
}

/**
 * Ativar telemetria de boost temporário
 */
export function activateTelemetryBoost(profileKey: string, tempGuard: boolean): void {
  const fpsBoost = calculateFpsBoost(profileKey)
  const ramReduction = Math.floor(Math.random() * 5) + 8 // 8-12%
  const tempReduction = tempGuard ? Math.floor(Math.random() * 3) + 2 : 0 // 2-4°C se tempGuard ativo
  
  activeTelemetry = {
    fpsBoost,
    ramReduction,
    tempReduction,
    duration: 60000 // 60 segundos
  }
  
  telemetryStartTime = Date.now()
  
  // Usar nome bonito para log visual
  const displayName = presetDisplayNames[profileKey] || profileKey
  log(`[${formatTime()}] Telemetria ativa: FPS +${fpsBoost}%, RAM -${ramReduction}%${tempGuard ? `, GPU -${tempReduction}°C` : ''}`, 'success')
}

/**
 * Obter boost ativo da telemetria
 */
export function getActiveTelemetryBoost(): TelemetryBoost | null {
  if (!activeTelemetry) return null
  
  const elapsed = Date.now() - telemetryStartTime
  if (elapsed >= activeTelemetry.duration) {
    // Reverter gradualmente
    const fadeTime = 5000 // 5 segundos para reverter
    if (elapsed >= activeTelemetry.duration + fadeTime) {
      activeTelemetry = null
      return null
    }
    
    // Fade out gradual
    const fadeProgress = (elapsed - activeTelemetry.duration) / fadeTime
    const fadeMultiplier = 1 - fadeProgress
    
    return {
      fpsBoost: activeTelemetry.fpsBoost * fadeMultiplier,
      ramReduction: activeTelemetry.ramReduction * fadeMultiplier,
      tempReduction: activeTelemetry.tempReduction * fadeMultiplier,
      duration: activeTelemetry.duration
    }
  }
  
  return activeTelemetry
}

/**
 * Executa o Turbo Mode com base no perfil ativo
 * @param profileIdentifier - Identificador interno do perfil (ex: 'esports', 'battlefield6')
 */
export async function runTurbo(profileIdentifier: string): Promise<TurboResult> {
  const startTime = Date.now()
  let steps = 0
  let errors = 0
  let tempGuard = false
  
  // Normalizar identificador para garantir que seja a chave correta
  const profileKey = profileIdentifier.toLowerCase().replace(/[\s\-]+/g, '')
  
  // Buscar configuração do perfil
  const preset = presets[profileKey]
  if (!preset) {
    throw new Error(`Perfil '${profileIdentifier}' não encontrado`)
  }

  // Obter nome bonito para logs
  const displayName = presetDisplayNames[profileKey] || profileIdentifier

  log(`[${formatTime()}] TURBO iniciado — perfil ${displayName}`, 'success')
  
  // Verificar se é BF6 para logs especiais
  const isBF6 = profileKey === 'battlefield6'
  if (isBF6) {
    log(`[${formatTime()}] BF6: priorização multicore + buffer VRAM`, 'info')
    tempGuard = true // BF6 sempre ativa tempGuard
  }

  // Executar operações sequencialmente
  const operations = [
    () => turboOperations.freeRam(),
    () => turboOperations.closeBackgroundApps(preset.backgroundApps),
    () => turboOperations.setCpuPriority(preset.cpuPriority),
    () => turboOperations.applyPowerPlan(preset.powerMode),
    () => turboOperations.setFanSpeed(preset.fanSpeed, tempGuard),
    () => turboOperations.applyGpuBoost(preset.gpuBoost),
    () => turboOperations.cleanTempCaches(),
    () => turboOperations.networkBoostBasic()
  ]

  for (const operation of operations) {
    try {
      const success = await operation()
      steps++
      if (!success) {
        errors++
      }
    } catch (error) {
      steps++
      errors++
      log(`[${formatTime()}] Erro na operação: ${error}`, 'error')
    }
  }

  const executionTime = Date.now() - startTime
  
  // Log final com resumo usando nome bonito
  log(`[${formatTime()}] TURBO finalizado: ${steps} etapas, ${errors} erros, tempGuard:${tempGuard}`, errors === 0 ? 'success' : 'error')

  // Ativar telemetria de boost usando chave interna
  activateTelemetryBoost(profileKey, tempGuard)
  
  // Salvar dados de persistência usando chave interna
  const turboData = {
    lastTurboAt: Date.now(),
    lastTurboProfile: profileKey // Salvar chave interna, não nome de display
  }
  localStorage.setItem('gb.turbo', JSON.stringify(turboData))

  return {
    steps,
    errors,
    tempGuard,
    executionTime,
    profile: displayName // Retornar nome bonito para exibição
  }
}

/**
 * Obter dados persistidos do último turbo
 */
export function getLastTurboData(): { lastTurboAt: number; lastTurboProfile: string } | null {
  try {
    const data = localStorage.getItem('gb.turbo')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Inicia uma sessão de jogo
 */
export function startSession(profileIdentifier: string): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Normalizar identificador
  const profileKey = profileIdentifier.toLowerCase().replace(/[\s\-]+/g, '')
  const displayName = presetDisplayNames[profileKey] || profileIdentifier
  
  currentSession = {
    id: sessionId,
    startTime: new Date(),
    profile: profileKey, // Usar chave interna
    active: true
  }
  
  log(`🎮 Sessão iniciada: ${displayName} (${sessionId})`, 'info')
  return sessionId
}

/**
 * Encerra a sessão de jogo ativa
 */
export function endSession(): void {
  if (currentSession) {
    currentSession.endTime = new Date()
    currentSession.active = false
    
    const duration = currentSession.endTime.getTime() - currentSession.startTime.getTime()
    const durationMinutes = Math.floor(duration / 60000)
    
    // Usar nome bonito para log
    const displayName = presetDisplayNames[currentSession.profile] || currentSession.profile
    
    log(`🏁 Sessão encerrada: ${durationMinutes}min (${displayName})`, 'info')
    currentSession = null
  }
}

/**
 * Retorna a sessão ativa atual
 */
export function getCurrentSession(): TurboSession | null {
  return currentSession
}

/**
 * Verifica se há uma sessão ativa
 */
export function hasActiveSession(): boolean {
  return currentSession !== null && currentSession.active
}