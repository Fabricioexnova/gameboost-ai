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
  notes: string
}

export const presets: Record<string, PresetConfig> = {
  esports: {
    cpuPriority: 'realtime',
    ramCleanup: 'aggressive',
    backgroundApps: 'kill-aggressive',
    fanSpeed: 90,
    powerMode: 'performance',
    gpuBoost: 'max',
    notes: 'Max FPS + lowest latency'
  },
  battleroyale: {
    cpuPriority: 'high',
    ramCleanup: 'balanced',
    backgroundApps: 'smart',
    fanSpeed: 75,
    powerMode: 'performance',
    gpuBoost: 'high',
    notes: 'FPS + estabilidade'
  },
  aaa: {
    cpuPriority: 'normal',
    ramCleanup: 'light',
    backgroundApps: 'minimal',
    fanSpeed: 65,
    powerMode: 'balanced',
    gpuBoost: 'quality',
    notes: 'Qualidade visual'
  },
  battlefield6: {
    cpuPriority: 'realtime-multicore',
    ramCleanup: 'aggressive',
    backgroundApps: 'kill-aggressive',
    fanSpeed: 100,
    powerMode: 'performance',
    gpuBoost: 'max-vram-buffer',
    notes: 'BF6: mapas grandes, multicore, VRAM buffer'
  },
  streamgame: {
    cpuPriority: 'split',
    ramCleanup: 'balanced',
    backgroundApps: 'smart',
    fanSpeed: 80,
    powerMode: 'performance',
    gpuBoost: 'balanced',
    notes: 'Game + OBS/NVENC'
  },
  silent: {
    cpuPriority: 'low',
    ramCleanup: 'minimal',
    backgroundApps: 'none',
    fanSpeed: 30,
    powerMode: 'eco',
    gpuBoost: 'low',
    notes: 'Baixo ruído'
  }
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
  'Silencioso': 'silent'
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
  silent: 'Silencioso'
}