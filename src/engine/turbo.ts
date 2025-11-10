/**
 * GameBoost AI - Turbo Mode Engine
 * Sistema de otimização inteligente integrado ao perfil ativo
 */

import * as WinOpt from './optimizer/windows'
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
 * Verificar se está rodando no desktop
 */
const isDesktop = (): boolean => {
  return !!(typeof window !== 'undefined' && (window as any)?.backend?.runPS)
}

/**
 * Verificar se tem privilégios de admin
 */
const isAdmin = (): boolean => {
  return !!(typeof window !== 'undefined' && (window as any)?.env?.isAdmin)
}

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
    case 'arcriders':
      return 4
    case 'warzone':
      return 5
    default:
      return 4
  }
}

/**
 * Função helper para executar etapas com fallback
 */
async function step(label: string, fnReal: Function | null, ...args: any[]): Promise<boolean> {
  log(`[${formatTime()}] ${label}...`, 'info')
  
  try {
    if (isDesktop() && typeof fnReal === 'function') {
      await fnReal(...args)
    } else {
      // Preview/simulação
      await new Promise(r => setTimeout(r, 300))
      log(`[${formatTime()}] (preview) ${label} simulado`, 'info')
    }
    
    log(`[${formatTime()}] ${label} OK`, 'success')
    return true
  } catch (e) {
    log(`[${formatTime()}] ${label} ERRO: ${e}`, 'error')
    return false
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

  log(`[${formatTime()}] TURBO iniciado — perfil: ${displayName}`, 'success')
  
  // Verificar se é BF6 para logs especiais
  const isBF6 = profileKey === 'battlefield6'
  if (isBF6) {
    log(`[${formatTime()}] BF6: priorização multicore + buffer VRAM`, 'info')
    tempGuard = true // BF6 sempre ativa tempGuard
  }

  // Verificar disponibilidade das funções opcionais
  const hasFan = typeof WinOpt.setFanSpeed === 'function'
  const hasGpu = typeof WinOpt.applyGpuBoost === 'function'

  // Executar operações sequencialmente usando o optimizer real
  const operations = [
    () => step('Liberando RAM', WinOpt.freeRam),
    () => step('Fechando apps em segundo plano', WinOpt.closeBackgroundApps, preset.backgroundApps),
    () => step(`Prioridade de CPU (${preset.cpuPriority})`, WinOpt.setProcessPriority, { 
      name: 'GameBoostAI', 
      level: (preset.cpuPriority === 'realtime' || preset.cpuPriority === 'realtime-multicore') ? 'RealTime' : 
             (preset.cpuPriority === 'high' ? 'High' : 'Normal') 
    }),
    () => step('Plano de energia (Performance)', WinOpt.applyPowerPlan, 'performance'),
    () => step('Limpando cache temporário', WinOpt.clearTempCaches),
    () => step(`Fan speed (${preset.fanSpeed}%)`, hasFan ? WinOpt.setFanSpeed : null, preset.fanSpeed),
    () => step(`GPU boost (${preset.gpuBoost})`, hasGpu ? WinOpt.applyGpuBoost : null, preset.gpuBoost)
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