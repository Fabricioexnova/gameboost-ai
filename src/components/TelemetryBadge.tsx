import { Monitor, Globe, Activity } from 'lucide-react'
import { useTelemetryStatus } from '../hooks/useTelemetryStatus'

type TelemetryBadgeProps = {
  className?: string
  showDetails?: boolean
}

export function TelemetryBadge({ className = '', showDetails = false }: TelemetryBadgeProps) {
  const { status = { mode: 'simulated', isRunning: false } } = (typeof useTelemetryStatus === 'function'
    ? useTelemetryStatus()
    : { status: { mode: 'simulated', isRunning: false } })

  const isReal = status.mode === 'real'
  const isRunning = !!status.isRunning

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${className} ${
        isReal
          ? 'bg-gradient-to-r from-[#00ff88]/20 to-[#00cc6a]/20 border-[#00ff88]/50'
          : 'bg-gradient-to-r from-[#ffa500]/20 to-[#ff8c00]/20 border-[#ffa500]/50'
      }`}
    >
      {isReal ? (
        <Monitor className="w-4 h-4 text-[#00ff88]" />
      ) : (
        <Globe className="w-4 h-4 text-[#ffa500]" />
      )}

      <span className={`text-sm font-medium ${isReal ? 'text-[#00ff88]' : 'text-[#ffa500]'}`}>
        {isReal ? 'Telemetria Real' : 'Telemetria Simulada'}
      </span>

      {showDetails && isRunning ? (
        <Activity
          className={`w-3 h-3 animate-pulse ${isReal ? 'text-[#00ff88]' : 'text-[#ffa500]'}`}
        />
      ) : null}
    </div>
  )
}

export function TelemetryBadgeCompact({ className = '' }: { className?: string }) {
  const { status = { mode: 'simulated', isRunning: false } } = (typeof useTelemetryStatus === 'function'
    ? useTelemetryStatus()
    : { status: { mode: 'simulated', isRunning: false } })
  const isReal = status.mode === 'real'

  return (
    <div
      className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${className} ${
        isReal
          ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
          : 'bg-[#ffa500]/10 text-[#ffa500] border border-[#ffa500]/30'
      }`}
    >
      {isReal ? <Monitor className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
      <span className="font-medium">{isReal ? 'Real' : 'Sim'}</span>
    </div>
  )
}