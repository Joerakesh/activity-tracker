import { useCallback, useEffect, useState } from 'react'
import './widget.css'

type WidgetStats = {
  tracking: boolean
  today: {
    activeSeconds: number
    idleSeconds: number
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function AppIcon() {
  return (
    <span className="widget-app-icon" aria-hidden="true">
      <svg viewBox="0 0 40 40" role="presentation">
        <defs>
          <linearGradient id="widget-icon-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ee5ff" />
            <stop offset="55%" stopColor="#3978ff" />
            <stop offset="100%" stopColor="#a05cff" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="#17182b" />
        <path d="M29 12a13 13 0 1 0 2 13" fill="none" stroke="url(#widget-icon-gradient)" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 10v10l7 4" fill="none" stroke="#f4f3ff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="22" y="26" width="4" height="6" rx="1.2" fill="#4ee5ff" />
        <rect x="28" y="22" width="4" height="10" rx="1.2" fill="#527dff" />
      </svg>
    </span>
  )
}

export default function Widget() {
  const [stats, setStats] = useState<WidgetStats | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const result = await window.trackerAPI.getStats()
      setStats(result)
    } catch (error) {
      console.error('Unable to load tracker status', error)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const unsubscribe = window.trackerAPI.onUpdated(() => {
      void refresh()
    })
    return unsubscribe
  }, [refresh])

  async function toggleTracking() {
    if (!stats || busy) return
    setBusy(true)
    try {
      await window.trackerAPI.setEnabled(!stats.tracking)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const root = document.getElementById('root')
    const previous = {
      htmlBackground: document.documentElement.style.background,
      bodyBackground: document.body.style.background,
      bodyMinWidth: document.body.style.minWidth,
      bodyHeight: document.body.style.height,
      bodyOverflow: document.body.style.overflow,
      rootHeight: root?.style.height ?? ''
    }

    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    document.body.style.minWidth = '0'
    document.body.style.height = '100%'
    document.body.style.overflow = 'hidden'
    if (root) root.style.height = '100%'

    return () => {
      document.documentElement.style.background = previous.htmlBackground
      document.body.style.background = previous.bodyBackground
      document.body.style.minWidth = previous.bodyMinWidth
      document.body.style.height = previous.bodyHeight
      document.body.style.overflow = previous.bodyOverflow
      if (root) root.style.height = previous.rootHeight
    }
  }, [])

  return (
    <main className="floating-widget" aria-label="Activity Tracker quick controls">
      <div className="widget-drag" title="Drag to move">
        <AppIcon />
        <span className={`widget-status-dot ${stats?.tracking ? 'is-live' : ''}`} />
        <div className="widget-time">
          <strong>{formatDuration(stats?.today.activeSeconds ?? 0)}</strong>
          <span>active today</span>
        </div>
      </div>

      <button
        className={`widget-toggle ${stats?.tracking ? 'is-paused' : ''}`}
        onClick={() => void toggleTracking()}
        disabled={!stats || busy}
        title={stats?.tracking ? 'Pause tracking' : 'Start tracking'}
        aria-label={stats?.tracking ? 'Pause tracking' : 'Start tracking'}
      >
        {stats?.tracking ? 'Ⅱ' : '▶'}
      </button>

      <button
        className="widget-action"
        onClick={() => void window.trackerAPI.showDashboard()}
        title="Open dashboard"
        aria-label="Open dashboard"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M7 4h9v9M16 4 6 14" />
        </svg>
      </button>

      <button
        className="widget-action close-widget"
        onClick={() => void window.trackerAPI.hideWidget()}
        title="Hide floating bar (Ctrl+Shift+Space to reopen)"
        aria-label="Hide floating bar"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </main>
  )
}
