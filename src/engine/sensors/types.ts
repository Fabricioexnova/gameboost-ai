/**
 * GameBoost AI - Tipos para Sistema de Sensores
 * Define estruturas de dados para telemetria do sistema
 */

export type Snapshot = {
  cpu: { 
    name?: string
    temp?: number
    usage?: number 
  }
  gpu: { 
    name?: string
    temp?: number
    usage?: number
    vramUsedPct?: number 
  }
  ramUsedPct?: number
  fps?: number
}