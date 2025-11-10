import { useState, useCallback } from 'react'

interface TelemetrySetupProps {
  className?: string
}

export function TelemetrySetup({ className = '' }: TelemetrySetupProps) {
  const [downloading, setDownloading] = useState(false)
  const [message, setMessage] = useState('')

  const isDesktop =
    typeof window !== 'undefined' &&
    !!(window as any)?.backend?.runPS

  const downloadTools = useCallback(async () => {
    if (!isDesktop) {
      setMessage('Modo navegador: simulação ativa, sem download real.')
      return
    }

    setDownloading(true)
    setMessage('Baixando ferramentas...')

    try {
      // Baixar via PowerShell no ambiente desktop
      const psScript = `
        $ErrorActionPreference = 'SilentlyContinue';

        $root = Join-Path $PWD "tools";
        if (!(Test-Path $root)) { New-Item -ItemType Directory -Path $root | Out-Null }

        # PresentMon download
        $pmUrl = "https://github.com/GameTechDev/PresentMon/releases/latest/download/PresentMon.exe"
        $pmDir = Join-Path $root "PresentMon"
        if (!(Test-Path $pmDir)) { New-Item -ItemType Directory -Path $pmDir | Out-Null }
        Invoke-WebRequest -Uri $pmUrl -OutFile (Join-Path $pmDir "PresentMon.exe")

        # LibreHardwareMonitor download
        $lhmUrl = "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest/download/LibreHardwareMonitor.exe"
        $lhmDir = Join-Path $root "LHM"
        if (!(Test-Path $lhmDir)) { New-Item -ItemType Directory -Path $lhmDir | Out-Null }
        Invoke-WebRequest -Uri $lhmUrl -OutFile (Join-Path $lhmDir "LibreHardwareMonitor.exe")

        "OK"
      `

      const result = await (window as any).backend.runPS(psScript)

      if (result.includes('OK')) {
        setMessage('✅ Ferramentas baixadas com sucesso!')
      } else {
        setMessage('⚠️ Talvez falhou: verifique diretório tools/')
      }
    } catch (err) {
      setMessage('❌ Erro ao baixar ferramentas: ' + err)
    } finally {
      setDownloading(false)
    }
  }, [isDesktop])

  return (
    <div className={`p-4 rounded-lg border border-white/10 ${className}`}>
      <h2 className="text-lg font-bold mb-2">Instalação de Telemetria</h2>

      <p className="text-sm mb-3">
        Baixe PresentMon e LibreHardwareMonitor automaticamente (apenas modo desktop).
      </p>

      <button
        disabled={downloading}
        onClick={downloadTools}
        className="px-4 py-2 bg-[#00ff88]/20 border border-[#00ff88]/50 hover:bg-[#00ff88]/30 rounded text-[#00ff88] font-semibold disabled:opacity-50"
      >
        {downloading ? 'Baixando...' : 'Baixar ferramentas'}
      </button>

      {message && (
        <p className="mt-3 text-xs opacity-80">
          {message}
        </p>
      )}
    </div>
  )
}