/**
 * GameBoost AI - Sistema de Sensores
 * Gerencia providers de telemetria com fallback automático
 */

import type { Snapshot } from './types'

export function isDesktop(): boolean {
  return !!(window as any)?.backend?.runPS
}

export async function getProvider() {
  const isDesktop = typeof window !== 'undefined' && !!(window as any)?.backend?.runPS;
  return isDesktop ? import('./windows') : import('./mock');
}