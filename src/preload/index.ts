
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('trackerAPI', {
  getStats: () => ipcRenderer.invoke('tracker:get-stats'),

  setEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('tracker:set-enabled', enabled),

  showDashboard: () => ipcRenderer.invoke('tracker:show-dashboard'),
  toggleWidget: () => ipcRenderer.invoke('tracker:toggle-widget'),
  hideWidget: () => ipcRenderer.invoke('tracker:hide-widget'),
  quit: () => ipcRenderer.invoke('tracker:quit'),

  setAlwaysOnTop: (enabled: boolean) =>
    ipcRenderer.invoke('tracker:set-always-on-top', enabled),

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
