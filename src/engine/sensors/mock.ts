/**
 * GameBoost AI - Provider de Sensores Mock
 * Fornece dados simulados para preview/desenvolvimento
 */

import type { Snapshot } from './types'

export async function init() {
  // Inicialização mock - sem operações necessárias
}

export async function getSnapshot(): Promise<Snapshot> {
  // Retorna dados simulados realistas
  return {
    cpu: {
      name: 'Intel i7-12700K',
      usage: 35,
      temp: 55
    },
    gpu: {
      name: 'NVIDIA RTX 4080',
      usage: 42,
      temp: 61,
      vramUsedPct: 38
    },
    ramUsedPct: 54,
    fps: 144
  }
}