'use client'

import { useState, useEffect } from 'react'
import { Cpu, Zap, Activity, Thermometer, HardDrive, Wifi, Play, Pause, Settings, Shield, Eye, Monitor, Gamepad2, Sliders, Info, Power, Trash2, PauseCircle, Fan, Battery, Globe, RefreshCw, Moon, Sun, Languages, List, AlertCircle, CheckCircle, Clock, X, Star } from 'lucide-react'
import { useEngine, useGameBoostOptimizer, useSystemMetrics, useProcessList, useProfiles, useTurbo } from '../engine/hooks'
import { getActiveTelemetryBoost } from '../engine/turbo'

export default function GameBoostAI() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [turboMode, setTurboMode] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState('E-Sports')
  const [turboActive, setTurboActive] = useState(false)
  
  // Engine state management
  const { initializing, ready, error, init, snapshot } = useEngine()
  
  // Profiles management
  const { 
    activeProfile, 
    applying, 
    applyPreset, 
    loadSavedProfile, 
    getActivePresetConfig, 
    getActiveProfileDisplayName,
    autoApplySavedProfile
  } = useProfiles()
  
  // Turbo Mode management
  const { running: turboRunning, cooldown, lastResult, run: runTurbo, getButtonState, getButtonTooltip } = useTurbo()
  
  // Performance States (fallback para compatibilidade)
  const [fps, setFps] = useState(144)
  const [cpuTemp, setCpuTemp] = useState(65)
  const [gpuTemp, setGpuTemp] = useState(72)
  const [cpuUsage, setCpuUsage] = useState(45)
  const [gpuUsage, setGpuUsage] = useState(78)
  const [ramUsage, setRamUsage] = useState(62)
  const [vramUsage, setVramUsage] = useState(54)

  // Manual Optimization States
  const [ramCleaner, setRamCleaner] = useState(false)
  const [cpuPriority, setCpuPriority] = useState(false)
  const [pauseApps, setPauseApps] = useState(false)
  const [fanControl, setFanControl] = useState(50)
  const [powerMode, setPowerMode] = useState('performance')

  // Optimization Engine Hooks
  const {
    isOptimizing,
    lastOptimization,
    logs,
    optimizeCpuRam,
    boostGamePriority,
    clearSystemCache,
    applyMaxPerformancePowerPlan,
    turboOptimization,
    getRunningProcesses,
    clearLogs
  } = useGameBoostOptimizer()

  const { metrics } = useSystemMetrics()
  const { processes, isLoading: processesLoading, refreshProcesses } = useProcessList()

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    visible: boolean
  }>({ type: 'info', message: '', visible: false })

  // Initialize engine on mount
  useEffect(() => {
    init()
  }, [init])

  // Load saved profile on mount and auto-apply when engine is ready
  useEffect(() => {
    const savedProfile = loadSavedProfile()
    if (savedProfile) {
      const displayName = getActiveProfileDisplayName()
      if (displayName) {
        setSelectedProfile(displayName)
      }
    }
  }, [loadSavedProfile, getActiveProfileDisplayName])

  // Auto-apply saved profile when engine becomes ready
  useEffect(() => {
    if (ready) {
      autoApplySavedProfile(true)
    }
  }, [ready, autoApplySavedProfile])

  // Update UI with snapshot data when available
  useEffect(() => {
    if (snapshot) {
      // Aplicar telemetria de boost se ativa
      const telemetryBoost = getActiveTelemetryBoost()
      
      let adjustedFps = snapshot.fps
      let adjustedRamUsage = (snapshot.memory.usage / snapshot.memory.total) * 100
      let adjustedGpuTemp = snapshot.gpu.temperature
      
      if (telemetryBoost) {
        adjustedFps = snapshot.fps * (1 + telemetryBoost.fpsBoost / 100)
        adjustedRamUsage = adjustedRamUsage * (1 - telemetryBoost.ramReduction / 100)
        adjustedGpuTemp = snapshot.gpu.temperature - telemetryBoost.tempReduction
      }
      
      setFps(Math.round(adjustedFps))
      setCpuTemp(Math.round(snapshot.cpu.temperature))
      setGpuTemp(Math.round(adjustedGpuTemp))
      setCpuUsage(Math.round(snapshot.cpu.usage))
      setGpuUsage(Math.round(snapshot.gpu.usage))
      setRamUsage(Math.round(adjustedRamUsage))
      setVramUsage(Math.round((snapshot.gpu.vramUsage / snapshot.gpu.vramTotal) * 100))
    }
  }, [snapshot])

  // Update optimization controls based on active preset
  useEffect(() => {
    const activePresetConfig = getActivePresetConfig()
    if (activePresetConfig) {
      // Sync UI controls with active preset
      setFanControl(activePresetConfig.fanSpeed)
      setPowerMode(activePresetConfig.powerMode)
      
      // Set optimization toggles based on preset
      setRamCleaner(activePresetConfig.ramCleanup !== 'minimal')
      setCpuPriority(activePresetConfig.cpuPriority !== 'low')
      setPauseApps(activePresetConfig.backgroundApps !== 'none')
    }
  }, [getActivePresetConfig])

  // Turbo active badge timer
  useEffect(() => {
    if (turboActive) {
      const timer = setTimeout(() => {
        setTurboActive(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [turboActive])

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, visible: true })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }))
    }, 4000)
  }

  // Handle profile selection with correct mapping
  const handleProfileSelect = async (profileName: string) => {
    if (applying || initializing || turboRunning) return
    
    // Verificar se Turbo está em cooldown
    if (cooldown > 0) {
      showNotification('info', 'Turbo em cooldown. Aguarde para aplicar novo preset.')
      return
    }
    
    // Mapear nome da UI para identificador correto do preset
    const profileKeyMap: Record<string, string> = {
      'E-Sports': 'esports',
      'Battle Royale': 'battleroyale', 
      'AAA Games': 'aaa',
      'Battlefield 6': 'battlefield6',
      'Stream + Game': 'streamgame',
      'Silencioso': 'silent'
    }
    
    const presetKey = profileKeyMap[profileName] || profileName.toLowerCase().replace(/\s+/g, '')
    
    setSelectedProfile(profileName)
    showNotification('info', `Aplicando perfil ${profileName}...`)
    
    const result = await applyPreset(presetKey)
    showNotification(result.success ? 'success' : 'error', result.message)
  }

  // Handle Turbo Mode
  const handleTurboMode = async () => {
    if (turboRunning || initializing) return
    
    if (cooldown > 0) {
      showNotification('info', `Aguarde ${cooldown}s para usar Turbo novamente`)
      return
    }

    // Verificar se engine está inicializando
    if (initializing) {
      showNotification('error', 'Aguarde a inicialização do engine')
      return
    }
    
    showNotification('info', 'Iniciando Turbo Mode...')
    const result = await runTurbo()
    
    if (result.success) {
      showNotification('success', result.message)
      setTurboActive(true) // Ativar badge por 5 segundos
    } else {
      showNotification('error', result.message)
    }
  }

  // Handle individual optimizations
  const handleOptimizeCpuRam = async () => {
    if (initializing) {
      showNotification('warning', 'Aguarde a inicialização do engine')
      return
    }
    
    showNotification('info', 'Liberando CPU/RAM...')
    const result = await optimizeCpuRam()
    showNotification(result.success ? 'success' : 'error', result.message)
  }

  const handleBoostGamePriority = async () => {
    if (initializing) {
      showNotification('warning', 'Aguarde a inicialização do engine')
      return
    }
    
    showNotification('info', 'Otimizando prioridade do jogo...')
    const result = await boostGamePriority()
    showNotification(result.success ? 'success' : 'error', result.message)
  }

  const handleClearCache = async () => {
    if (initializing) {
      showNotification('warning', 'Aguarde a inicialização do engine')
      return
    }
    
    showNotification('info', 'Limpando cache do sistema...')
    const result = await clearSystemCache()
    showNotification(result.success ? 'success' : 'error', result.message)
  }

  const handlePowerPlan = async () => {
    if (initializing) {
      showNotification('warning', 'Aguarde a inicialização do engine')
      return
    }
    
    showNotification('info', 'Aplicando plano de energia...')
    const result = await applyMaxPerformancePowerPlan()
    showNotification(result.success ? 'success' : 'error', result.message)
  }

  // Handle reapply profile with correct mapping
  const handleReapplyProfile = async () => {
    const activeProfileDisplayName = getActiveProfileDisplayName()
    if (!activeProfileDisplayName) return
    
    // Usar o identificador interno correto
    showNotification('info', `Reaplicando perfil ${activeProfileDisplayName}...`)
    const result = await applyPreset(activeProfile!) // activeProfile já é o identificador correto
    showNotification(result.success ? 'success' : 'error', result.message)
  }

  // Splash Screen Component
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#16213e] flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#00ff88]/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#ff0080]/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>
        
        <div className="text-center z-10">
          {/* Animated Logo */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-[#00ff88]/50 animate-pulse">
              <Eye className="w-12 h-12 text-black" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#ff0080] rounded-full animate-ping"></div>
            </div>
            {/* Scanning Ring */}
            <div className="absolute inset-0 border-4 border-[#00ff88] rounded-2xl animate-spin opacity-60"></div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00ff88] to-[#00cc6a] bg-clip-text text-transparent mb-2">
            GameBoost AI
          </h1>
          <p className="text-[#ff0080] text-lg font-semibold mb-8">Sentinela Digital</p>
          
          {/* Loading Animation */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-bounce delay-200"></div>
          </div>
          
          <p className="text-gray-400 text-lg animate-pulse">
            Initializing performance engine...
          </p>
        </div>
      </div>
    )
  }

  // Error Screen Component
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#16213e] flex items-center justify-center relative overflow-hidden">
        <div className="text-center z-10 max-w-md mx-auto p-8">
          {/* Error Icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#ff0080] to-[#cc0066] rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-[#ff0080]/50">
              <AlertCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-[#ff0080] mb-4">
            Erro na Inicialização
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            {error}
          </p>
          
          <button
            onClick={init}
            className="px-8 py-4 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-lg hover:shadow-[#00ff88]/30 transition-all duration-300 transform hover:scale-105"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  const GameBoostLogo = () => (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-lg flex items-center justify-center shadow-lg shadow-[#00ff88]/30">
          <div className="relative">
            <Eye className="w-6 h-6 text-black" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff0080] rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/20 to-transparent rounded-lg animate-pulse"></div>
      </div>
      
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00ff88] to-[#00cc6a] bg-clip-text text-transparent">
          GameBoost
        </h1>
        <span className="text-sm text-[#ff0080] font-semibold tracking-wider">AI</span>
      </div>
    </div>
  )

  const NavigationTab = ({ id, label, icon: Icon, active }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-300 ${
        active 
          ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88] shadow-lg shadow-[#00ff88]/20' 
          : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-[#00ff88]/50 hover:text-[#00ff88] hover:bg-[#00ff88]/5'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  )

  const StatusCard = ({ title, value, unit, color, icon: Icon, percentage, subtitle }: any) => (
    <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-4 relative overflow-hidden group hover:border-[#00ff88]/40 transition-all duration-300 hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#00ff88]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <span className="text-gray-300 text-sm font-medium">{title}</span>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xl font-bold ${color}`}>{Math.round(value)}</span>
            <span className="text-gray-400 text-sm ml-1">{unit}</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${color === 'text-[#00ff88]' ? 'from-[#00ff88] to-[#00cc6a]' : 
                       color === 'text-[#ff0080]' ? 'from-[#ff0080] to-[#cc0066]' : 
                       color === 'text-[#ffa500]' ? 'from-[#ffa500] to-[#ff8c00]' :
                       'from-[#00bfff] to-[#0080ff]'} transition-all duration-500 relative`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )

  const TurboButton = () => {
    const buttonState = getButtonState()
    const tooltip = getButtonTooltip()
    
    return (
      <div className="relative group">
        <button
          onClick={handleTurboMode}
          disabled={turboRunning || initializing}
          className={`relative w-40 h-40 rounded-full border-4 transition-all duration-500 transform hover:scale-105 ${
            buttonState === 'running'
              ? 'border-[#00ff88] bg-gradient-to-br from-[#00ff88]/20 to-[#00cc6a]/20 shadow-2xl shadow-[#00ff88]/50 animate-pulse' 
              : buttonState === 'cooldown'
              ? 'border-[#ffa500] bg-gradient-to-br from-[#ffa500]/20 to-[#ff8c00]/20 shadow-lg shadow-[#ffa500]/30'
              : 'border-gray-600 bg-gradient-to-br from-gray-800 to-gray-900 hover:border-[#00ff88]/50 hover:shadow-lg hover:shadow-[#00ff88]/20'
          } ${turboRunning || initializing ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {buttonState === 'running' && (
            <>
              <div className="absolute -inset-4 border-2 border-[#00ff88] rounded-full animate-spin opacity-60"></div>
              <div className="absolute -inset-8 border border-[#ff0080] rounded-full animate-ping opacity-40"></div>
            </>
          )}
          
          <div className="flex flex-col items-center justify-center h-full">
            {buttonState === 'running' ? (
              <RefreshCw className="w-12 h-12 mb-3 text-[#00ff88] animate-spin" />
            ) : (
              <Zap className={`w-12 h-12 mb-3 ${buttonState === 'cooldown' ? 'text-[#ffa500]' : 'text-gray-400'}`} />
            )}
            <span className={`text-lg font-bold ${buttonState === 'running' ? 'text-[#00ff88]' : buttonState === 'cooldown' ? 'text-[#ffa500]' : 'text-gray-400'}`}>
              TURBO
            </span>
            <span className={`text-sm ${buttonState === 'running' ? 'text-[#00ff88]' : buttonState === 'cooldown' ? 'text-[#ffa500]' : 'text-gray-500'}`}>
              {buttonState === 'running' ? 'OTIMIZANDO' : 
               buttonState === 'cooldown' ? `${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}` : 
               'INATIVO'}
            </span>
          </div>
          
          {buttonState === 'running' && (
            <>
              <div className="absolute top-6 right-6 w-3 h-3 bg-[#ff0080] rounded-full animate-ping"></div>
              <div className="absolute bottom-6 left-6 w-2 h-2 bg-[#00ff88] rounded-full animate-ping delay-300"></div>
              <div className="absolute top-6 left-6 w-1 h-1 bg-[#ffa500] rounded-full animate-ping delay-700"></div>
            </>
          )}
        </button>
        
        {/* Tooltip */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {tooltip}
        </div>
      </div>
    )
  }

  // Notification Component
  const NotificationToast = () => (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      notification.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`flex items-center space-x-3 px-6 py-4 rounded-lg border shadow-lg ${
        notification.type === 'success' ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88]' :
        notification.type === 'error' ? 'bg-[#ff0080]/10 border-[#ff0080] text-[#ff0080]' :
        notification.type === 'warning' ? 'bg-[#ffa500]/10 border-[#ffa500] text-[#ffa500]' :
        'bg-[#ffa500]/10 border-[#ffa500] text-[#ffa500]'
      }`}>
        {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
        {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
        {(notification.type === 'info' || notification.type === 'warning') && <Clock className="w-5 h-5" />}
        <span className="font-medium">{notification.message}</span>
        <button 
          onClick={() => setNotification(prev => ({ ...prev, visible: false }))}
          className="ml-2 hover:opacity-70"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const ProfileCard = ({ name, description, icon: Icon, active, onClick, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
        active 
          ? 'border-[#00ff88] bg-gradient-to-br from-[#00ff88]/10 to-[#00cc6a]/5 shadow-lg shadow-[#00ff88]/20' 
          : 'border-gray-600 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] hover:border-[#00ff88]/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
          active ? 'bg-[#00ff88]/20' : 'bg-gray-700'
        }`}>
          <Icon className={`w-8 h-8 ${active ? 'text-[#00ff88]' : 'text-gray-400'}`} />
        </div>
        <div>
          <h3 className={`font-bold text-lg ${active ? 'text-[#00ff88]' : 'text-white'}`}>
            {name}
          </h3>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        {applying && active && (
          <div className="flex items-center space-x-2 mt-2">
            <RefreshCw className="w-4 h-4 text-[#00ff88] animate-spin" />
            <span className="text-[#00ff88] text-sm">Aplicando...</span>
          </div>
        )}
      </div>
    </button>
  )

  const OptimizationSwitch = ({ label, description, checked, onChange, color = 'text-[#00ff88]', disabled = false }: any) => (
    <div className={`flex items-center justify-between p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600 hover:border-[#00ff88]/30 transition-all duration-300 ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <h4 className="text-white font-medium">{label}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
          checked ? 'bg-[#00ff88]' : 'bg-gray-600'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
          checked ? 'left-7' : 'left-1'
        }`}></div>
      </button>
    </div>
  )

  const Slider = ({ label, value, onChange, min = 0, max = 100, unit = '%', disabled = false }: any) => (
    <div className={`p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-white font-medium">{label}</span>
        <span className="text-[#00ff88] font-bold">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => !disabled && onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #00ff88 0%, #00ff88 ${value}%, #374151 ${value}%, #374151 100%)`
        }}
      />
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl border border-[#00ff88]/30 flex items-center justify-center relative overflow-hidden">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#00ff88] rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-[#ff0080] rounded-full animate-spin opacity-60"></div>
            </div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#ff0080] rounded-full animate-pulse"></div>
            <div className="absolute bottom-2 left-2 w-1 h-1 bg-[#00ff88] rounded-full animate-pulse delay-500"></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/20 to-[#ff0080]/20 rounded-2xl blur-sm animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold text-[#00ff88] mb-2">Sentinela Digital Ativo</h2>
        <p className="text-gray-400">Monitorando performance em tempo real</p>
      </div>

      {/* Engine Status Warning */}
      {initializing && (
        <div className="bg-gradient-to-r from-[#ffa500]/10 to-[#ff8c00]/10 border border-[#ffa500] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-[#ffa500]" />
            <span className="text-[#ffa500] font-medium">Engine Inicializando</span>
          </div>
          <p className="text-gray-400 text-sm">Algumas funcionalidades estão temporariamente bloqueadas</p>
        </div>
      )}

      {/* Turbo Control */}
      <div className="flex justify-center">
        <TurboButton />
      </div>

      {/* FPS Monitor with Turbo Badge */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/30 px-8 py-4 flex items-center space-x-4">
            <Monitor className="w-6 h-6 text-[#00ff88]" />
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-[#00ff88]">{Math.round(fps)}</span>
              <span className="text-lg text-gray-400">FPS</span>
            </div>
            <div className="w-24 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] transition-all duration-500"
                style={{ width: `${Math.min((fps / 240) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Turbo Active Badge */}
          {turboActive && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              Turbo ativo
            </div>
          )}
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard 
          title="CPU Temp" 
          value={cpuTemp} 
          unit="°C" 
          color="text-[#00ff88]" 
          icon={Cpu}
          percentage={(cpuTemp / 100) * 100}
          subtitle="Intel i7-12700K"
        />
        <StatusCard 
          title="GPU Temp" 
          value={gpuTemp} 
          unit="°C" 
          color="text-[#ff0080]" 
          icon={Activity}
          percentage={(gpuTemp / 100) * 100}
          subtitle="RTX 4070 Ti"
        />
        <StatusCard 
          title="RAM Usage" 
          value={ramUsage} 
          unit="%" 
          color="text-[#ffa500]" 
          icon={HardDrive}
          percentage={ramUsage}
          subtitle="32GB DDR5"
        />
        <StatusCard 
          title="VRAM Usage" 
          value={vramUsage} 
          unit="%" 
          color="text-[#00bfff]" 
          icon={Monitor}
          percentage={vramUsage}
          subtitle="12GB GDDR6X"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-6">
          <h3 className="text-lg font-bold text-[#00ff88] mb-4 flex items-center">
            <Cpu className="w-5 h-5 mr-2" />
            CPU Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Uso</span>
              <span className="text-[#00ff88] font-bold">{Math.round(cpuUsage)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4">
              <div 
                className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] rounded-full transition-all duration-500 relative"
                style={{ width: `${cpuUsage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#ff0080]/20 p-6">
          <h3 className="text-lg font-bold text-[#ff0080] mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            GPU Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Uso</span>
              <span className="text-[#ff0080] font-bold">{Math.round(gpuUsage)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-4">
              <div 
                className="h-full bg-gradient-to-r from-[#ff0080] to-[#cc0066] rounded-full transition-all duration-500 relative"
                style={{ width: `${gpuUsage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Logs */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#00ff88] flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Logs de Otimização
          </h3>
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
          >
            Limpar
          </button>
        </div>
        <div className="bg-black/30 rounded-lg p-4 h-32 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">Nenhum log disponível</p>
          ) : (
            logs.slice(-10).map((log, index) => (
              <div key={index} className="text-green-400 mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const renderProfiles = () => {
    const activePresetConfig = getActivePresetConfig()
    const activeProfileDisplayName = getActiveProfileDisplayName()
    const isBF6Active = activeProfile === 'battlefield6'

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#00ff88] mb-4">Perfis de Otimização</h2>
          <p className="text-gray-400">Selecione o perfil ideal para seu tipo de jogo</p>
        </div>

        {/* Engine Status Warning */}
        {initializing && (
          <div className="bg-gradient-to-r from-[#ffa500]/10 to-[#ff8c00]/10 border border-[#ffa500] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-[#ffa500]" />
              <span className="text-[#ffa500] font-medium">Engine Inicializando</span>
            </div>
            <p className="text-gray-400 text-sm">Aguarde para aplicar perfis de otimização</p>
          </div>
        )}

        {/* Turbo Mode Blocking */}
        {(turboRunning || applying) && (
          <div className="bg-gradient-to-r from-[#ff0080]/10 to-[#cc0066]/10 border border-[#ff0080] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <RefreshCw className="w-5 h-5 text-[#ff0080] animate-spin" />
              <span className="text-[#ff0080] font-medium">
                {turboRunning ? 'Turbo Mode Ativo' : 'Aplicando Perfil'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Seleção de perfis temporariamente bloqueada</p>
          </div>
        )}

        {/* Turbo Cooldown Warning */}
        {cooldown > 0 && !turboRunning && (
          <div className="bg-gradient-to-r from-[#ffa500]/10 to-[#ff8c00]/10 border border-[#ffa500] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-[#ffa500]" />
              <span className="text-[#ffa500] font-medium">Turbo em cooldown. Aguarde para aplicar novo preset.</span>
            </div>
            <p className="text-gray-400 text-sm">Tempo restante: {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProfileCard
            name="E-Sports"
            description="Máximo FPS, mínima latência"
            icon={Zap}
            active={selectedProfile === 'E-Sports'}
            onClick={() => handleProfileSelect('E-Sports')}
            disabled={applying || initializing || turboRunning || cooldown > 0}
          />
          <ProfileCard
            name="Battle Royale"
            description="Equilíbrio entre FPS e qualidade"
            icon={Shield}
            active={selectedProfile === 'Battle Royale'}
            onClick={() => handleProfileSelect('Battle Royale')}
            disabled={applying || initializing || turboRunning || cooldown > 0}
          />
          <ProfileCard
            name="AAA Games"
            description="Máxima qualidade visual"
            icon={Eye}
            active={selectedProfile === 'AAA Games'}
            onClick={() => handleProfileSelect('AAA Games')}
            disabled={applying || initializing || turboRunning || cooldown > 0}
          />
          <ProfileCard
            name="Battlefield 6"
            description="Otimizado para BF6"
            icon={Gamepad2}
            active={selectedProfile === 'Battlefield 6'}
            onClick={() => handleProfileSelect('Battlefield 6')}
            disabled={applying || initializing || turboRunning || cooldown > 0}
          />
          <ProfileCard
            name="Stream + Game"
            description="Otimizado para streaming"
            icon={Monitor}
            active={selectedProfile === 'Stream + Game'}
            onClick={() => handleProfileSelect('Stream + Game')}
            disabled={applying || initializing || turboRunning || cooldown > 0}
          />
          <ProfileCard
            name="Silencioso"
            description="Mínimo ruído, economia energia"
            icon={Moon}
            active={selectedProfile === 'Silencioso'}
            onClick={() => handleProfileSelect('Silencioso')}
            disabled={applying || initializing || turboRunning || cooldown > 0}
          />
        </div>

        {/* Profile Details */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#00ff88]">
              Perfil Ativo: {activeProfileDisplayName || selectedProfile}
            </h3>
            
            {/* BF6 Special Badge */}
            {isBF6Active && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#ff0080]/20 to-[#cc0066]/20 border border-[#ff0080] rounded-lg">
                <Star className="w-5 h-5 text-[#ff0080]" />
                <span className="text-[#ff0080] font-bold">BF6 — Modo Avançado</span>
              </div>
            )}

            {/* Reapply Profile Button */}
            {activeProfileDisplayName && (
              <button
                onClick={handleReapplyProfile}
                disabled={applying || initializing || turboRunning}
                className="px-4 py-2 bg-gradient-to-r from-[#00ff88]/10 to-[#00cc6a]/10 border border-[#00ff88]/30 rounded-lg hover:border-[#00ff88] transition-all duration-300 text-[#00ff88] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reaplicar perfil
              </button>
            )}
          </div>
          
          {activePresetConfig ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <Cpu className="w-8 h-8 text-[#00ff88] mx-auto mb-2" />
                <p className="text-white font-medium">CPU Priority</p>
                <p className="text-[#00ff88] text-sm capitalize">{activePresetConfig.cpuPriority}</p>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <Activity className="w-8 h-8 text-[#ff0080] mx-auto mb-2" />
                <p className="text-white font-medium">GPU Boost</p>
                <p className="text-[#ff0080] text-sm capitalize">{activePresetConfig.gpuBoost}</p>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <HardDrive className="w-8 h-8 text-[#ffa500] mx-auto mb-2" />
                <p className="text-white font-medium">RAM Cleanup</p>
                <p className="text-[#ffa500] text-sm capitalize">{activePresetConfig.ramCleanup}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <Cpu className="w-8 h-8 text-[#00ff88] mx-auto mb-2" />
                <p className="text-white font-medium">CPU Priority</p>
                <p className="text-[#00ff88] text-sm">High</p>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <Activity className="w-8 h-8 text-[#ff0080] mx-auto mb-2" />
                <p className="text-white font-medium">GPU Boost</p>
                <p className="text-[#ff0080] text-sm">Maximum</p>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                <HardDrive className="w-8 h-8 text-[#ffa500] mx-auto mb-2" />
                <p className="text-white font-medium">RAM Cleanup</p>
                <p className="text-[#ffa500] text-sm">Aggressive</p>
              </div>
            </div>
          )}

          {/* BF6 Special Tips */}
          {isBF6Active && (
            <div className="mt-4 p-4 bg-gradient-to-r from-[#ff0080]/10 to-[#cc0066]/10 border border-[#ff0080]/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-[#ff0080]" />
                <span className="text-[#ff0080] font-bold">Dicas BF6:</span>
              </div>
              <p className="text-gray-300 text-sm">
                Multicore ativo · VRAM buffer · Pacing estável
              </p>
            </div>
          )}

          {activePresetConfig && !isBF6Active && (
            <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
              <p className="text-gray-300 text-sm">
                <span className="text-[#00ff88] font-medium">Notas:</span> {activePresetConfig.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderOptimization = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#00ff88] mb-4">Otimização Manual</h2>
        <p className="text-gray-400">Controle avançado do sistema</p>
      </div>

      {/* Engine Status Warning */}
      {initializing && (
        <div className="bg-gradient-to-r from-[#ffa500]/10 to-[#ff8c00]/10 border border-[#ffa500] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-[#ffa500]" />
            <span className="text-[#ffa500] font-medium">Engine Inicializando</span>
          </div>
          <p className="text-gray-400 text-sm">Controles de otimização temporariamente bloqueados</p>
        </div>
      )}

      {/* Turbo Mode Blocking */}
      {turboRunning && (
        <div className="bg-gradient-to-r from-[#ff0080]/10 to-[#cc0066]/10 border border-[#ff0080] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <RefreshCw className="w-5 h-5 text-[#ff0080] animate-spin" />
            <span className="text-[#ff0080] font-medium">Turbo Mode Ativo</span>
          </div>
          <p className="text-gray-400 text-sm">Controles manuais temporariamente bloqueados</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Optimization */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Sliders className="w-6 h-6 mr-2 text-[#00ff88]" />
            Otimizações do Sistema
          </h3>
          
          <OptimizationSwitch
            label="Limpeza de RAM"
            description="Libera memória não utilizada automaticamente"
            checked={ramCleaner}
            onChange={setRamCleaner}
            disabled={initializing || turboRunning}
          />
          
          <OptimizationSwitch
            label="Prioridade de CPU"
            description="Define prioridade alta para jogos"
            checked={cpuPriority}
            onChange={setCpuPriority}
            disabled={initializing || turboRunning}
          />
          
          <OptimizationSwitch
            label="Pausar Apps em Background"
            description="Suspende aplicações desnecessárias"
            checked={pauseApps}
            onChange={setPauseApps}
            disabled={initializing || turboRunning}
          />
        </div>

        {/* Hardware Control */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Fan className="w-6 h-6 mr-2 text-[#ff0080]" />
            Controle de Hardware
          </h3>
          
          <Slider
            label="Controle de Ventoinhas"
            value={fanControl}
            onChange={setFanControl}
            min={30}
            max={100}
            unit="%"
            disabled={initializing || turboRunning}
          />
          
          <div className={`p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600 ${initializing || turboRunning ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-medium">Modo de Energia</span>
              <span className="text-[#00ff88] font-bold capitalize">{powerMode}</span>
            </div>
            <div className="flex space-x-2">
              {['eco', 'balanced', 'performance'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => !(initializing || turboRunning) && setPowerMode(mode)}
                  disabled={initializing || turboRunning}
                  className={`px-4 py-2 rounded-lg border transition-all duration-300 capitalize ${
                    powerMode === mode
                      ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]'
                      : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-[#00ff88]/50'
                  } ${initializing || turboRunning ? 'cursor-not-allowed' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-6">
        <h3 className="text-xl font-bold text-[#00ff88] mb-6">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={handleOptimizeCpuRam}
            disabled={isOptimizing || initializing || turboRunning}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-[#00ff88]/10 to-[#00cc6a]/10 border border-[#00ff88]/30 rounded-lg hover:border-[#00ff88] transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5 text-[#00ff88] group-hover:animate-pulse" />
            <span className="text-[#00ff88] font-medium">Liberar RAM</span>
          </button>
          
          <button 
            onClick={handleBoostGamePriority}
            disabled={isOptimizing || initializing || turboRunning}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-[#ff0080]/10 to-[#cc0066]/10 border border-[#ff0080]/30 rounded-lg hover:border-[#ff0080] transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-5 h-5 text-[#ff0080] group-hover:animate-pulse" />
            <span className="text-[#ff0080] font-medium">Boost Jogo</span>
          </button>
          
          <button 
            onClick={handleClearCache}
            disabled={isOptimizing || initializing || turboRunning}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-[#ffa500]/10 to-[#ff8c00]/10 border border-[#ffa500]/30 rounded-lg hover:border-[#ffa500] transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-5 h-5 text-[#ffa500] group-hover:animate-spin" />
            <span className="text-[#ffa500] font-medium">Limpar Cache</span>
          </button>

          <button 
            onClick={handlePowerPlan}
            disabled={isOptimizing || initializing || turboRunning}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-[#00bfff]/10 to-[#0080ff]/10 border border-[#00bfff]/30 rounded-lg hover:border-[#00bfff] transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Battery className="w-5 h-5 text-[#00bfff] group-hover:animate-pulse" />
            <span className="text-[#00bfff] font-medium">Max Performance</span>
          </button>
        </div>
      </div>

      {/* Process List */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#00ff88] flex items-center">
            <List className="w-6 h-6 mr-2" />
            Processos em Execução
          </h3>
          <button
            onClick={refreshProcesses}
            disabled={processesLoading || initializing}
            className="px-4 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg hover:border-[#00ff88] transition-all duration-300 text-[#00ff88] disabled:opacity-50"
          >
            {processesLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Atualizar'
            )}
          </button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {processes.slice(0, 10).map((process) => (
            <div key={process.pid} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${process.isEssential ? 'bg-[#ff0080]' : 'bg-[#00ff88]'}`}></div>
                <div>
                  <span className="text-white font-medium">{process.name}</span>
                  <p className="text-gray-400 text-sm">PID: {process.pid}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[#00ff88] font-bold">{process.cpuUsage.toFixed(1)}%</span>
                <p className="text-gray-400 text-sm">{process.memoryUsage}MB</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[#00ff88] mb-4">Configurações</h2>
        <p className="text-gray-400">Personalize sua experiência</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-[#00ff88]" />
            Configurações Gerais
          </h3>
          
          <div className="p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-medium">Idioma</span>
              <Languages className="w-5 h-5 text-[#00ff88]" />
            </div>
            <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-[#00ff88] focus:outline-none">
              <option>Português (Brasil)</option>
              <option>English (US)</option>
              <option>Español</option>
              <option>Français</option>
            </select>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-white font-medium">Tema Escuro</span>
                <p className="text-gray-400 text-sm">Interface otimizada para gaming</p>
              </div>
              <button className="relative w-12 h-6 rounded-full bg-[#00ff88]">
                <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full"></div>
              </button>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-[#ff0080]" />
            Sistema
          </h3>
          
          <button className="w-full p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600 hover:border-[#00ff88]/50 transition-all duration-300 text-left">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium">Backup do Sistema</span>
                <p className="text-gray-400 text-sm">Criar ponto de restauração</p>
              </div>
              <Shield className="w-5 h-5 text-[#00ff88]" />
            </div>
          </button>
          
          <button className="w-full p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-gray-600 hover:border-[#ff0080]/50 transition-all duration-300 text-left">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium">Restaurar Sistema</span>
                <p className="text-gray-400 text-sm">Voltar configurações originais</p>
              </div>
              <RefreshCw className="w-5 h-5 text-[#ff0080]" />
            </div>
          </button>
        </div>
      </div>

      {/* Updates & About */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-6">
        <h3 className="text-xl font-bold text-[#00ff88] mb-6">Atualizações & Sobre</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div>
                <span className="text-white font-medium">Versão Atual</span>
                <p className="text-gray-400 text-sm">GameBoost AI v2.1.0</p>
              </div>
              <div className="w-3 h-3 bg-[#00ff88] rounded-full animate-pulse"></div>
            </div>
            
            <button className="w-full p-4 bg-gradient-to-r from-[#00ff88]/10 to-[#00cc6a]/10 border border-[#00ff88]/30 rounded-lg hover:border-[#00ff88] transition-all duration-300">
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="w-5 h-5 text-[#00ff88]" />
                <span className="text-[#00ff88] font-medium">Verificar Atualizações</span>
              </div>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <h4 className="text-white font-medium mb-2">Sobre o GameBoost AI</h4>
              <p className="text-gray-400 text-sm mb-3">
                Sentinela digital para otimização de performance em jogos, 
                com inteligência artificial avançada.
              </p>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-[#00ff88]" />
                <span className="text-[#00ff88] text-sm font-medium">IA Futura Ativada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#16213e] text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%2300ff88\\' fill-opacity=\\'0.03\\'%3E%3Ccircle cx=\\'30\\' cy=\\'30\\' r=\\'1\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      {/* Notification Toast */}
      <NotificationToast />
      
      {/* Header */}
      <header className="relative z-10 p-6 border-b border-[#00ff88]/20 bg-gradient-to-r from-[#1a1a2e]/80 to-[#16213e]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <GameBoostLogo />
          
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-lg border border-[#00ff88]/30 px-4 py-2 flex items-center space-x-3">
              <Activity className="w-5 h-5 text-[#00ff88]" />
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-bold text-[#00ff88]">{Math.round(fps)}</span>
                <span className="text-sm text-gray-400">FPS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-10 p-6 border-b border-[#00ff88]/10">
        <div className="flex flex-wrap gap-4 justify-center">
          <NavigationTab 
            id="dashboard" 
            label="Dashboard" 
            icon={Monitor} 
            active={activeTab === 'dashboard'} 
          />
          <NavigationTab 
            id="profiles" 
            label="Perfis" 
            icon={Gamepad2} 
            active={activeTab === 'profiles'} 
          />
          <NavigationTab 
            id="optimization" 
            label="Otimização" 
            icon={Sliders} 
            active={activeTab === 'optimization'} 
          />
          <NavigationTab 
            id="settings" 
            label="Configurações" 
            icon={Settings} 
            active={activeTab === 'settings'} 
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'profiles' && renderProfiles()}
          {activeTab === 'optimization' && renderOptimization()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Floating Elements */}
      <div className="fixed top-20 right-6 opacity-30">
        <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-ping"></div>
      </div>
      <div className="fixed bottom-20 left-6 opacity-30">
        <div className="w-1 h-1 bg-[#ff0080] rounded-full animate-ping delay-700"></div>
      </div>
      <div className="fixed top-1/2 right-4 opacity-20">
        <div className="w-1 h-1 bg-[#ffa500] rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00ff88;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00ff88;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }
      `}</style>
    </div>
  )
}