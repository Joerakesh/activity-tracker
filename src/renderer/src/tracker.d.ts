
export {}

type DayStats = {
  date: string
  activeSeconds: number
  idleSeconds: number
}

type AppUsage = {
  name: string
  seconds: number
}

type TrackerStats = {
  tracking: boolean
  today: DayStats
  lastSevenDays: DayStats[]
  lastThirtyDays: DayStats[]
  dailyApplications: Record<string, AppUsage[]>
  applications: AppUsage[]
  launchAtLogin: boolean
  alwaysOnTop: boolean
}

declare global {
  interface Window {
    trackerAPI: {
      getStats: () => Promise<TrackerStats>
      setEnabled: (enabled: boolean) => Promise<TrackerStats>
      showDashboard: () => Promise<void>
      toggleWidget: () => Promise<void>
      hideWidget: () => Promise<void>
      quit: () => Promise<void>
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>
      setLaunchAtLogin: (enabled: boolean) => Promise<boolean>
      onUpdated: (callback: () => void) => () => void
    }
  }
}
