
import { useCallback, useEffect, useState } from 'react'
import './assets/main.css'

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
  applications: AppUsage[]
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)

  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function App() {
  const [stats, setStats] = useState<TrackerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const result = await window.trackerAPI.getStats()
      setStats(result)
      setError('')
    } catch {
      setError('Could not load activity data.')
    } finally {
      setLoading(false)
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
      const result = await window.trackerAPI.setEnabled(!stats.tracking)
      setStats(result)
      setError('')
    } catch {
      setError('Could not change the tracking state.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <main className="loading">Loading your activity...</main>
  }

  const today = stats?.today
  const applications = stats?.applications ?? []

  const totalAppSeconds = applications.reduce(
    (sum, item) => sum + item.seconds,
    0
  )

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <strong>Activity</strong>
            <span>PERSONAL TRACKER</span>
          </div>
        </div>

        <div className="nav-item active">
          <span>◫</span> Overview
        </div>

        <div className="nav-item">
          <span>◷</span> Screen activity
        </div>

        <div className="nav-item">
          <span>⚙</span> Settings
        </div>

        <div className="sidebar-footer">
          <span className="privacy-dot" />
          Stored locally on this PC
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
            <h1>Activity overview</h1>
            <p className="muted">
              Understand how you spend your time on your laptop.
            </p>
          </div>

          <div className="date-pill">
            {new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        <section className="tracking-card">
          <div className="tracking-copy">
            <div className="live-label">
              <span
                className={`status-dot ${stats?.tracking ? 'live' : ''}`}
              />
              {stats?.tracking ? 'TRACKING ENABLED' : 'TRACKING PAUSED'}
            </div>

            <h2>
              {stats?.tracking
                ? 'Your activity is being recorded'
                : 'Ready when you are'}
            </h2>

            <p>
              {stats?.tracking
                ? 'Active and idle time are saved on this computer.'
                : 'Start tracking to collect today’s activity.'}
            </p>
          </div>

          <button
            className={`track-button ${stats?.tracking ? 'stop' : ''}`}
            onClick={() => void toggleTracking()}
            disabled={busy}
          >
            {busy
              ? 'Updating...'
              : stats?.tracking
                ? 'Stop tracking'
                : 'Start tracking'}
          </button>
        </section>

        <div className="section-heading">
          <div>
            <h2>Today's summary</h2>
            <p className="muted">Your recorded computer activity</p>
          </div>
        </div>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon purple">◷</span>
            <p>Active time</p>
            <strong>{formatDuration(today?.activeSeconds ?? 0)}</strong>
            <span className="stat-note">
              Keyboard or mouse recently used
            </span>
          </article>

          <article className="stat-card">
            <span className="stat-icon blue">◌</span>
            <p>Idle time</p>
            <strong>{formatDuration(today?.idleSeconds ?? 0)}</strong>
            <span className="stat-note">
              No recent keyboard or mouse input
            </span>
          </article>

          <article className="stat-card">
            <span className="stat-icon green">▤</span>
            <p>Recorded time</p>
            <strong>
              {formatDuration(
                (today?.activeSeconds ?? 0) +
                  (today?.idleSeconds ?? 0)
              )}
            </strong>
            <span className="stat-note">
              Total time while tracking was on
            </span>
          </article>
        </section>

        <section className="chart-card applications-card">
          <div className="chart-header">
            <div>
              <h2>Top applications</h2>
              <p className="muted">
                Time spent in each application today
              </p>
            </div>

            <span className="app-count">
              {applications.length} apps
            </span>
          </div>

          {applications.length > 0 ? (
            <div className="application-list">
              {applications.slice(0, 8).map((item) => {
                const percentage =
                  totalAppSeconds > 0
                    ? (item.seconds / totalAppSeconds) * 100
                    : 0

                return (
                  <div className="application-row" key={item.name}>
                    <div className="application-info">
                      <span
                        className="application-name"
                        title={item.name}
                      >
                        {item.name}
                      </span>

                      <strong>{formatDuration(item.seconds)}</strong>
                    </div>

                    <div className="application-bar-track">
                      <div
                        className="application-bar"
                        style={{
                          width: `${Math.min(100, percentage)}%`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="empty-apps">
              No application usage recorded yet. Start tracking and use
              your other applications for a few minutes.
            </p>
          )}
        </section>

        <footer className="privacy-note">
          <span>🔒</span>
          <div>
            <strong>Your data stays on your computer</strong>
            <p>
              This version does not upload activity records to a server.
            </p>
          </div>
        </footer>

        <p className="shortcut-note">
          Tip: Press Ctrl + Shift + Space to toggle the floating tracker.
        </p>
      </section>
    </main>
  )
}

export default App
