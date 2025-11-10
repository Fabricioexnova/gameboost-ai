const { contextBridge, ipcRenderer } = require('electron')

/**
 * Preload Script - Ponte Segura entre Main e Renderer
 * Expõe APIs controladas para o processo renderer
 */

// Validar argumentos de entrada
function validateCommand(command) {
  if (typeof command !== 'string') {
    throw new Error('Comando deve ser uma string')
  }
  
  if (command.length === 0 || command.length > 1000) {
    throw new Error('Comando deve ter entre 1 e 1000 caracteres')
  }
  
  return true
}

function validateFilePath(filePath) {
  if (typeof filePath !== 'string') {
    throw new Error('Caminho do arquivo deve ser uma string')
  }
  
  if (filePath.length === 0 || filePath.length > 500) {
    throw new Error('Caminho deve ter entre 1 e 500 caracteres')
  }
  
  return true
}

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('backend', {
  /**
   * Executar comando PowerShell
   * @param {string} command - Comando a ser executado
   * @param {number} timeout - Timeout em millisegundos (padrão: 30000)
   * @returns {Promise<{stdout: string, stderr: string, code: number, duration: number}>}
   */
  runPS: async (command, timeout = 30000) => {
    try {
      validateCommand(command)
      
      if (typeof timeout !== 'number' || timeout < 1000 || timeout > 120000) {
        timeout = 30000 // Default seguro
      }
      
      const result = await ipcRenderer.invoke('run-powershell', command, timeout)
      
      // Garantir que o resultado tem a estrutura esperada
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        code: typeof result.code === 'number' ? result.code : 1,
        duration: typeof result.duration === 'number' ? result.duration : 0
      }
      
    } catch (error) {
      return {
        stdout: '',
        stderr: error.message || 'Erro desconhecido',
        code: 1,
        duration: 0
      }
    }
  },

  /**
   * Ler arquivo do sistema
   * @param {string} filePath - Caminho do arquivo
   * @returns {Promise<{success: boolean, content?: string, error?: string}>}
   */
  readFile: async (filePath) => {
    try {
      validateFilePath(filePath)
      
      const result = await ipcRenderer.invoke('read-file', filePath)
      
      return {
        success: result.success || false,
        content: result.content || '',
        error: result.error || ''
      }
      
    } catch (error) {
      return {
        success: false,
        content: '',
        error: error.message || 'Erro desconhecido'
      }
    }
  },

  /**
   * Solicitar elevação de privilégios
   * @returns {Promise<{success: boolean, message: string}>}
   */
  requestElevation: async () => {
    try {
      const result = await ipcRenderer.invoke('request-elevation')
      
      return {
        success: result.success || false,
        message: result.message || 'Erro desconhecido'
      }
      
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erro ao solicitar elevação'
      }
    }
  }
})

// Expor informações do ambiente
contextBridge.exposeInMainWorld('env', {
  /**
   * Obter informações do ambiente
   * @returns {Promise<{isDesktop: boolean, isAdmin: boolean, platform: string, arch: string, version: string}>}
   */
  getInfo: async () => {
    try {
      const result = await ipcRenderer.invoke('get-environment')
      
      return {
        isDesktop: result.isDesktop || false,
        isAdmin: result.isAdmin || false,
        platform: result.platform || 'unknown',
        arch: result.arch || 'unknown',
        version: result.version || '0.0.0'
      }
      
    } catch (error) {
      return {
        isDesktop: false,
        isAdmin: false,
        platform: 'unknown',
        arch: 'unknown',
        version: '0.0.0'
      }
    }
  }
})

// Utilitários para logging (opcional)
contextBridge.exposeInMainWorld('electronUtils', {
  /**
   * Log para o console do processo principal
   * @param {string} message - Mensagem para log
   * @param {string} level - Nível do log (info, warn, error)
   */
  log: (message, level = 'info') => {
    if (typeof message === 'string' && message.length > 0) {
      console.log(`[Renderer ${level.toUpperCase()}] ${message}`)
    }
  },

  /**
   * Obter timestamp formatado
   * @returns {string} Timestamp no formato HH:MM:SS
   */
  getTimestamp: () => {
    return new Date().toTimeString().slice(0, 8)
  }
})

// Log de inicialização
console.log('[Preload] Ponte segura inicializada')
console.log('[Preload] APIs expostas: backend, env, electronUtils')