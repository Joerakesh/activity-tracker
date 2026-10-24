
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
    <main className="floating-widget">
      <div className="widget-drag" title="Drag to move">
        <span className="widget-mark">A</span>
        <div className="widget-labels">
          <strong>Activity</strong>
          <span>{stats?.tracking ? 'TRACKING' : 'PAUSED'}</span>
        </div>
      </div>

      <div className="widget-time">
        <strong>{formatDuration(stats?.today.activeSeconds ?? 0)}</strong>
        <span>active today</span>
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
        ↗
      </button>

      <button
        className="widget-action close-widget"
        onClick={() => void window.trackerAPI.hideWidget()}
        title="Hide floating bar"
        aria-label="Hide floating bar"
      >
        ×
      </button>
    </main>
  )
}
