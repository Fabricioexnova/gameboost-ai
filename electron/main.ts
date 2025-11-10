import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    // Em dev, tentamos carregar http://localhost:3000; caso contrário, o index da pasta dist
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow?.loadFile(path.join(process.cwd(), 'dist', 'index.html'))
    })
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// Executar PowerShell com segurança
ipcMain.handle('runPS', async (_evt, script: string) => {
  return await new Promise<string>((resolve) => {
    try {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command', script
      ], { windowsHide: true })

      let out = ''
      let err = ''

      ps.stdout.on('data', d => out += d.toString())
      ps.stderr.on('data', d => err += d.toString())
      ps.on('close', code => {
        resolve(err ? `ERR(${code}): ${err || out}` : out || `OK(${code})`)
      })
    } catch (e: any) {
      resolve(`ERR: ${e?.message || e}`)
    }
  })
})

app.on('ready', createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (mainWindow === null) createWindow() })