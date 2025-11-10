const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { spawn } = require('child_process')
const os = require('os')

// Verificar se é Windows
const isWindows = os.platform() === 'win32'

// Estado da aplicação
let mainWindow
let isAdmin = false

/**
 * Verificar se a aplicação está rodando como administrador (Windows)
 */
async function checkAdminRights() {
  if (!isWindows) {
    return true // Em sistemas não-Windows, assumir permissões adequadas
  }

  return new Promise((resolve) => {
    const child = spawn('net', ['session'], { shell: true })
    
    child.on('error', () => {
      resolve(false)
    })
    
    child.on('exit', (code) => {
      // Se o comando 'net session' executa sem erro, o usuário é admin
      resolve(code === 0)
    })
    
    // Timeout de 3 segundos
    setTimeout(() => {
      child.kill()
      resolve(false)
    }, 3000)
  })
}

/**
 * Solicitar elevação de privilégios (Windows)
 */
async function requestElevation() {
  if (!isWindows) return false

  try {
    // Reiniciar a aplicação com privilégios de administrador
    const { spawn } = require('child_process')
    const appPath = process.execPath
    
    // Usar PowerShell para solicitar elevação
    const elevateCommand = `Start-Process -FilePath "${appPath}" -Verb RunAs`
    
    spawn('powershell', ['-Command', elevateCommand], {
      detached: true,
      stdio: 'ignore'
    })
    
    // Fechar a instância atual
    app.quit()
    return true
  } catch (error) {
    console.error('Erro ao solicitar elevação:', error)
    return false
  }
}

/**
 * Executar comando PowerShell com timeout
 */
async function runPowerShellCommand(command, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    // Log da ação
    console.log(`[${new Date().toTimeString().slice(0, 8)}] Executando: ${command}`)
    
    if (!isWindows) {
      // Em sistemas não-Windows, simular resultado
      resolve({
        stdout: 'Comando simulado (não-Windows)',
        stderr: '',
        code: 0,
        duration: 100
      })
      return
    }

    const child = spawn('powershell', ['-Command', command], {
      shell: true,
      windowsHide: true
    })

    let stdout = ''
    let stderr = ''
    let finished = false

    const finish = (code) => {
      if (finished) return
      finished = true
      
      const duration = Date.now() - startTime
      const result = { stdout, stderr, code, duration }
      
      // Log do resultado
      const status = code === 0 ? 'OK' : 'ERRO'
      console.log(`[${new Date().toTimeString().slice(0, 8)}] ${command.slice(0, 50)}... ${status}`)
      
      resolve(result)
    }

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('exit', (code) => {
      finish(code || 0)
    })

    child.on('error', (error) => {
      stderr += error.message
      finish(1)
    })

    // Timeout
    setTimeout(() => {
      if (!finished) {
        child.kill()
        stderr += `Timeout após ${timeoutMs}ms`
        finish(124) // Código de timeout
      }
    }, timeoutMs)
  })
}

/**
 * Ler arquivo do sistema (com validação de segurança)
 */
async function readSystemFile(filePath) {
  const fs = require('fs').promises
  const path = require('path')
  
  try {
    // Validações de segurança
    const normalizedPath = path.normalize(filePath)
    
    // Bloquear caminhos perigosos
    const dangerousPaths = [
      'system32',
      'windows',
      'program files',
      'users',
      'documents and settings'
    ]
    
    const lowerPath = normalizedPath.toLowerCase()
    if (dangerousPaths.some(dangerous => lowerPath.includes(dangerous))) {
      throw new Error('Acesso negado: caminho não permitido')
    }
    
    // Limitar tamanho do arquivo (max 1MB)
    const stats = await fs.stat(normalizedPath)
    if (stats.size > 1024 * 1024) {
      throw new Error('Arquivo muito grande (max 1MB)')
    }
    
    const content = await fs.readFile(normalizedPath, 'utf8')
    return { success: true, content }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Criar janela principal
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../icon.png'), // Opcional: ícone da aplicação
    titleBarStyle: 'default',
    show: false // Não mostrar até estar pronto
  })

  // Carregar a aplicação
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../out/index.html')}`
  
  mainWindow.loadURL(startUrl)

  // Mostrar janela quando pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Abrir DevTools apenas em desenvolvimento
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Gerenciar links externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Configurar IPC handlers
 */
function setupIPC() {
  // Handler para executar comandos PowerShell
  ipcMain.handle('run-powershell', async (event, command, timeout = 30000) => {
    try {
      // Validações de segurança
      if (typeof command !== 'string' || command.length > 1000) {
        throw new Error('Comando inválido')
      }
      
      // Bloquear comandos perigosos
      const dangerousCommands = [
        'format',
        'del ',
        'rm ',
        'rmdir',
        'shutdown',
        'restart',
        'reboot',
        'taskkill /f',
        'net user',
        'net localgroup'
      ]
      
      const lowerCommand = command.toLowerCase()
      if (dangerousCommands.some(dangerous => lowerCommand.includes(dangerous))) {
        throw new Error('Comando não permitido por segurança')
      }
      
      const result = await runPowerShellCommand(command, timeout)
      return result
      
    } catch (error) {
      return {
        stdout: '',
        stderr: error.message,
        code: 1,
        duration: 0
      }
    }
  })

  // Handler para ler arquivos
  ipcMain.handle('read-file', async (event, filePath) => {
    return await readSystemFile(filePath)
  })

  // Handler para obter informações do ambiente
  ipcMain.handle('get-environment', async () => {
    return {
      isDesktop: true,
      isAdmin: isAdmin,
      platform: os.platform(),
      arch: os.arch(),
      version: app.getVersion()
    }
  })

  // Handler para solicitar elevação
  ipcMain.handle('request-elevation', async () => {
    if (isAdmin) {
      return { success: true, message: 'Já possui privilégios de administrador' }
    }
    
    const success = await requestElevation()
    return { 
      success, 
      message: success 
        ? 'Solicitação de elevação enviada' 
        : 'Falha ao solicitar elevação' 
    }
  })
}

/**
 * Inicialização da aplicação
 */
app.whenReady().then(async () => {
  // Verificar privilégios de administrador
  isAdmin = await checkAdminRights()
  
  console.log('GameBoost AI Desktop iniciando...')
  console.log(`Plataforma: ${os.platform()}`)
  console.log(`Privilégios de admin: ${isAdmin}`)
  
  // Se não for admin no Windows, solicitar elevação
  if (isWindows && !isAdmin) {
    console.log('Solicitando privilégios de administrador...')
    // Opcional: mostrar dialog perguntando se quer continuar sem admin
    // Por enquanto, continuar sem admin mas avisar na UI
  }
  
  // Configurar IPC
  setupIPC()
  
  // Criar janela
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Prevenir navegação para URLs externas
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    if (parsedUrl.origin !== 'http://localhost:3000' && !navigationUrl.startsWith('file://')) {
      navigationEvent.preventDefault()
    }
  })
})

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada:', reason)
})