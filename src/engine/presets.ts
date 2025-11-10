/**
 * GameBoost AI - Presets de Otimização
 * Perfis pré-configurados para diferentes tipos de jogos
 */

export interface PresetConfig {
  cpuPriority: string
  ramCleanup: string
  backgroundApps: string
  fanSpeed: number
  powerMode: string
  gpuBoost: string
  notes?: string
}

export const presets: Record<string, PresetConfig> = {
  esports: {
    cpuPriority: 'realtime',
    ramCleanup: 'aggressive',
    backgroundApps: 'kill-aggressive',
    fanSpeed: 90,
    powerMode: 'performance',
    gpuBoost: 'max'
  },
  battleroyale: {
    cpuPriority: 'high',
    ramCleanup: 'balanced',
    backgroundApps: 'smart',
    fanSpeed: 75,
    powerMode: 'performance',
    gpuBoost: 'high'
  },
  aaa: {
    cpuPriority: 'normal',
    ramCleanup: 'light',
    backgroundApps: 'minimal',
    fanSpeed: 65,
    powerMode: 'balanced',
    gpuBoost: 'quality'
  },
  battlefield6: {
    cpuPriority: 'realtime-multicore',
    ramCleanup: 'aggressive',
    backgroundApps: 'kill-aggressive',
    fanSpeed: 100,
    powerMode: 'performance',
    gpuBoost: 'max-vram-buffer'
  },
  streamgame: {
    cpuPriority: 'split',
    ramCleanup: 'balanced',
    backgroundApps: 'smart',
    fanSpeed: 80,
    powerMode: 'performance',
    gpuBoost: 'balanced'
  },
  silent: {
    cpuPriority: 'low',
    ramCleanup: 'minimal',
    backgroundApps: 'none',
    fanSpeed: 30,
    powerMode: 'eco',
    gpuBoost: 'low'
  },
  arcriders: {
    cpuPriority: 'high',
    ramCleanup: 'balanced',
    backgroundApps: 'smart',
    fanSpeed: 85,
    powerMode: 'performance',
    gpuBoost: 'balanced'
  },
  warzone: {
    cpuPriority: 'realtime',
    ramCleanup: 'aggressive',
    backgroundApps: 'kill-aggressive',
    fanSpeed: 95,
    powerMode: 'performance',
    gpuBoost: 'max'
  }
}

export default presets

/**
 * Normaliza nomes de perfis para identificadores corretos
 */
export function normalizeProfileName(name: string): string | null {
  const m = name.toLowerCase().replace(/[\s\+\-\_]/g, '')
  const map: Record<string, string> = {
    esports: 'esports',
    'esports': 'esports',
    battleroyale: 'battleroyale',
    'battleroyale': 'battleroyale',
    aaa: 'aaa',
    aaagames: 'aaa',
    battlefield6: 'battlefield6',
    bf6: 'battlefield6',
    streamgame: 'streamgame',
    streamjogo: 'streamgame',
    'stream+game': 'streamgame',
    silent: 'silent',
    silencioso: 'silent',
    arcriders: 'arcriders',
    arcraiders: 'arcriders',
    arider: 'arcriders',
    warzone: 'warzone'
  }
  return map[m] || null
}

/**
 * Mapeia nomes de perfis da UI para chaves dos presets
 */
export const profileNameMap: Record<string, string> = {
  'E-Sports': 'esports',
  'Battle Royale': 'battleroyale',
  'AAA Games': 'aaa',
  'Battlefield 6': 'battlefield6',
  'Stream + Game': 'streamgame',
  'Silencioso': 'silent',
  'Arc Raiders': 'arcriders',
  'Warzone': 'warzone'
}

/**
 * Mapeia chaves dos presets para nomes da UI
 */
export const presetDisplayNames: Record<string, string> = {
  esports: 'E-Sports',
  battleroyale: 'Battle Royale',
  aaa: 'AAA Games',
  battlefield6: 'Battlefield 6',
  streamgame: 'Stream + Game',
  silent: 'Silencioso',
  arcriders: 'Arc Raiders',
  warzone: 'Warzone'
}