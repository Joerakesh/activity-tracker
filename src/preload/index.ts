
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('trackerAPI', {
  getStats: () => ipcRenderer.invoke('tracker:get-stats'),

  setEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('tracker:set-enabled', enabled),

  showDashboard: () => ipcRenderer.invoke('tracker:show-dashboard'),
  quit: () => ipcRenderer.invoke('tracker:quit'),

  setLaunchAtLogin: (enabled: boolean) =>
    ipcRenderer.invoke('tracker:set-launch-at-login', enabled),

  onUpdated: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('tracker:updated', listener)

    return () => {
      ipcRenderer.removeListener('tracker:updated', listener)
    }
  }
})
