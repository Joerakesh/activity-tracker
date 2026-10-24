
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  powerMonitor,
  globalShortcut,
  Tray
} from 'electron'
import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

type DayStats = {
  date: string
  activeSeconds: number
  idleSeconds: number
}

type AppUsage = {
  name: string
  seconds: number
}

type TrackerData = {
  days: Record<string, DayStats>
  appUsage: Record<string, Record<string, AppUsage>>
}

type Preferences = {
  tracking: boolean
  launchAtLogin: boolean
}

type ActiveWindowInfo = {
  owner?: { name?: string }
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  let dashboard: BrowserWindow | null = null
  let tray: Tray | null = null
  let tickTimer: ReturnType<typeof setInterval> | undefined
  let activeWindow: (() => Promise<ActiveWindowInfo | undefined>) | undefined
  let sampling = false
  let tracking = false
  let launchAtLogin = true
  let previousTick = Date.now()
  let quitting = false

  const TICK_INTERVAL_MS = 5_000
  const IDLE_THRESHOLD_SECONDS = 60

  const dataPath = () => join(app.getPath('userData'), 'activity.json')
  const preferencesPath = () => join(app.getPath('userData'), 'preferences.json')

  function today(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  async function readPreferences(): Promise<Preferences> {
    try {
      const value = JSON.parse(await readFile(preferencesPath(), 'utf8'))
      return {
        tracking: value.tracking === true,
        launchAtLogin: value.launchAtLogin !== false,
      }
    } catch {
      return { tracking: true, launchAtLogin: true }
    }
  }

  async function savePreferences(): Promise<void> {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(
      preferencesPath(),
      JSON.stringify({ tracking, launchAtLogin }, null, 2),
      'utf8'
    )
  }

  async function loadData(): Promise<TrackerData> {
    try {
      const value = JSON.parse(await readFile(dataPath(), 'utf8'))
      return {
        days: value.days ?? {},
        appUsage: value.appUsage ?? {}
      }
    } catch {
      return { days: {}, appUsage: {} }
    }
  }

  async function saveData(data: TrackerData): Promise<void> {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(dataPath(), JSON.stringify(data, null, 2), 'utf8')
  }

  async function getStats() {
    const data = await loadData()
    const date = today()
    const todayStats = data.days[date] ?? {
      date,
      activeSeconds: 0,
      idleSeconds: 0
    }

    const makeDayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const lastThirtyDays = Array.from({ length: 30 }, (_, index) => {
      const d = new Date()
      d.setDate(d.getDate() - (29 - index))
      const key = makeDayKey(d)
      return data.days[key] ?? { date: key, activeSeconds: 0, idleSeconds: 0 }
    })
    const lastSevenDays = lastThirtyDays.slice(-7)
    const dailyApplications = Object.fromEntries(
      lastThirtyDays.map((day) => [
        day.date,
        Object.values(data.appUsage[day.date] ?? {}).sort((a, b) => b.seconds - a.seconds)
      ])
    )
    const applications = dailyApplications[date] ?? []

    return {
      tracking,
      today: todayStats,
      lastSevenDays,
      lastThirtyDays,
      dailyApplications,
      applications,
      launchAtLogin,
    }
  }

  function notifyWindows(): void {
    for (const win of [dashboard]) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('tracker:updated')
      }
    }
    updateTrayMenu()
  }

  async function recordTick(): Promise<void> {
    if (sampling) return
    sampling = true

    try {
      const now = Date.now()
      const elapsed = Math.min(Math.round((now - previousTick) / 1000), 10)
      previousTick = now

      if (!tracking || elapsed <= 0) return

      const data = await loadData()
      const date = today()
      const day = data.days[date] ?? {
        date,
        activeSeconds: 0,
        idleSeconds: 0
      }

      if (powerMonitor.getSystemIdleTime() >= IDLE_THRESHOLD_SECONDS) {
        day.idleSeconds += elapsed
      } else {
        day.activeSeconds += elapsed

        try {
          if (!activeWindow) {
            const module = await import('get-windows')
            activeWindow = module.activeWindow
          }

          const result = await activeWindow()
          const name = result?.owner?.name?.trim()

          if (name && !['electron', 'activity-tracker'].includes(name.toLowerCase())) {
            data.appUsage[date] ??= {}
            const current = data.appUsage[date][name] ?? { name, seconds: 0 }
            current.seconds += elapsed
            data.appUsage[date][name] = current
          }
        } catch (error) {
          console.error('Foreground app detection failed:', error)
        }
      }

      data.days[date] = day
      await saveData(data)
      notifyWindows()
    } finally {
      sampling = false
    }
  }

  function loadWindow(win: BrowserWindow): void {
    if (process.env['ELECTRON_RENDERER_URL']) {
      void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      void win.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  function createDashboard(show = true): void {
    if (dashboard && !dashboard.isDestroyed()) {
      if (show) {
        dashboard.show()
        dashboard.focus()
      }
      return
    }

  dashboard = new BrowserWindow({
  width: 1100,
  height: 760,
  minWidth: 760,
  minHeight: 560,
  show,
  icon: join(app.getAppPath(), 'resources', 'icon.ico'),
  backgroundColor: '#101116',
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
})
    loadWindow(dashboard)
    dashboard.on('closed', () => { dashboard = null })
  }

  function setTracking(enabled: boolean): void {
    tracking = enabled
    previousTick = Date.now()
    void savePreferences()
    notifyWindows()
  }

  function toggleDashboard(): void {
    if (!dashboard || dashboard.isDestroyed()) {
      createDashboard(true)
      return
    }
    if (dashboard.isVisible()) dashboard.hide()
    else {
      dashboard.show()
      dashboard.focus()
    }
  }

  function registerGlobalShortcuts(): void {
    const shortcut = 'CommandOrControl+Shift+Space'
    const registered = globalShortcut.register(shortcut, toggleDashboard)
    if (!registered) console.error(`Failed to register global shortcut: ${shortcut}`)
    else console.log(`Global shortcut registered: ${shortcut}`)
  }

  function updateTrayMenu(): void {
    if (!tray || tray.isDestroyed()) return

    const menu = Menu.buildFromTemplate([
      { label: tracking ? 'Pause tracking' : 'Start tracking', click: () => setTracking(!tracking) },
      { type: 'separator' },
      { label: 'Open dashboard', click: () => createDashboard(true) },
      { label: dashboard?.isVisible() ? 'Hide dashboard' : 'Show dashboard', click: toggleDashboard },
      { type: 'separator' },
      {
        label: 'Launch with Windows',
        type: 'checkbox',
        checked: launchAtLogin,
        click: (item) => {
          launchAtLogin = item.checked
          app.setLoginItemSettings({
            openAtLogin: launchAtLogin,
            args: ['--hidden']
          })
          void savePreferences()
          updateTrayMenu()
        }
      },
      { type: 'separator' },
      { label: 'Quit Activity Tracker', click: () => {
        quitting = true
        app.quit()
      } }
    ])

    tray.setContextMenu(menu)
    tray.setToolTip(`Activity Tracker — ${tracking ? 'Tracking' : 'Paused'}`)
  }

  function createTray(): void {
    // Simple embedded icon avoids requiring an extra icon asset.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#8774ff"/><path d="M5 17h5l3-8 5 15 3-7h6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    tray = new Tray(nativeImage.createFromDataURL(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    ))
    tray.on('click', toggleDashboard)
    updateTrayMenu()
  }

  ipcMain.handle('tracker:get-stats', () => getStats())

  ipcMain.handle('tracker:set-enabled', (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid tracking setting')
    setTracking(enabled)
    return getStats()
  })

  ipcMain.handle('tracker:show-dashboard', () => createDashboard(true))
  ipcMain.handle('tracker:quit', () => {
    quitting = true
    app.quit()
  })


  ipcMain.handle('tracker:set-launch-at-login', async (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid setting')
    launchAtLogin = enabled
    app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] })
    await savePreferences()
    updateTrayMenu()
    return launchAtLogin
  })

  app.on('second-instance', () => createDashboard(true))

  app.whenReady().then(async () => {
    const preferences = await readPreferences()
    tracking = preferences.tracking
    launchAtLogin = preferences.launchAtLogin

    app.setLoginItemSettings({
      openAtLogin: launchAtLogin,
      args: ['--hidden']
    })

   createTray()
registerGlobalShortcuts()

    const startHidden = process.argv.includes('--hidden')
    if (!startHidden) createDashboard(true)

    tickTimer = setInterval(() => {
      void recordTick().catch(console.error)
    }, TICK_INTERVAL_MS)

    powerMonitor.on('suspend', () => { previousTick = Date.now() })
    powerMonitor.on('resume', () => { previousTick = Date.now() })

    app.on('activate', () => createDashboard(true))
  })

app.on('before-quit', () => {
  quitting = true
  globalShortcut.unregisterAll()

  if (tickTimer) clearInterval(tickTimer)
  tray?.destroy()
})

 
}
