import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('backend', {
  runPS: (script: string) => ipcRenderer.invoke('runPS', script)
})

contextBridge.exposeInMainWorld('env', {
  isDesktop: true
})