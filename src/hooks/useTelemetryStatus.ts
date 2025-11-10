import { useState, useEffect, useCallback } from 'react'
import * as Telemetry from '../engine/telemetry'

export interface TelemetryStatus {
  mode: 'real' | 'simulated'
  presentMonAvailable: boolean
  lhmAvailable: boolean
  isRunning: boolean
}

export function useTelemetryStatus() {
  const [status, setStatus] = useState<TelemetryStatus>({
    mode: 'simulated',
    presentMonAvailable: false,
    lhmAvailable: false,
    isRunning: false
  })

  // Ambiente Desktop detectado
  const isDesktop = typeof window !== 'undefined' && !!(window as any)?.backend?.runPS

  // Checagem segura sem fs/path
  const checkToolsAvailability = useCallback(() => {
    if (!isDesktop) {
      setStatus(prev => ({
        ...prev,
        mode: 'simulated',
        presentMonAvailable: false,
        lhmAvailable: false
      }))
      return
    }

    // Simulação segura
    const presentMonExists = Telemetry.hasPresentMon?.() ?? false
    const lhmExists = Telemetry.hasLHM?.() ?? false

    const mode = presentMonExists && lhmExists ? 'real' : 'simulated'

    setStatus(prev => ({
      ...prev,
      mode,
      presentMonAvailable: presentMonExists,
      lhmAvailable: lhmExists
    }))
  }, [isDesktop])

  // Checar se telemetria está rodando
  const checkRunningStatus = useCallback(() => {
    const isRunning = Telemetry.isRunning?.() ?? false
    setStatus(prev => ({ ...prev, isRunning }))
  }, [])

  // Polling
  useEffect(() => {
    checkToolsAvailability()
    checkRunningStatus()

    const interval = setInterval(() => {
      checkRunningStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [checkToolsAvailability, checkRunningStatus])

  const refreshStatus = useCallback(() => {
    checkToolsAvailability()
    checkRunningStatus()
  }, [checkToolsAvailability, checkRunningStatus])

  return {
    status,
    refreshStatus
  }
}