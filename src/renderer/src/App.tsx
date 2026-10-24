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
  lastThirtyDays: DayStats[]
  dailyApplications: Record<string, AppUsage[]>
  launchAtLogin: boolean
}

type Page = 'overview' | 'activity' | 'analytics' | 'settings'

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric'
  })
}

const navigation: { id: Page; icon: string; label: string; group: string }[] = [
  { id: 'overview', icon: '⌂', label: 'Overview', group: 'WORKSPACE' },
  { id: 'activity', icon: '◷', label: 'Screen activity', group: 'WORKSPACE' },
  { id: 'analytics', icon: '⌁', label: 'Analytics', group: 'WORKSPACE' },
  { id: 'settings', icon: '⚙', label: 'Settings', group: 'PREFERENCES' }
]

function App() {
  const [stats, setStats] = useState<TrackerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [analyticsRange, setAnalyticsRange] = useState<'7' | '30'>('7')
  const [showCustomize, setShowCustomize] = useState(false)
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('activity-analytics-cards') || '{"trend":true,"apps":true,"comparison":true}') }
    catch { return { trend: true, apps: true, comparison: true } }
  })
  const [page, setPage] = useState<Page>('overview')
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('activity-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

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
    const unsubscribe = window.trackerAPI.onUpdated(() => void refresh())
    return unsubscribe
  }, [refresh])

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem('activity-sidebar-collapsed', String(next))
      } catch {
        // The sidebar still works if browser storage is unavailable.
      }
      return next
    })
  }

  async function toggleTracking() {
    if (!stats || busy) return
    setBusy(true)
    try {
      setStats(await window.trackerAPI.setEnabled(!stats.tracking))
      setError('')
    } catch {
      setError('Could not change the tracking state.')
    } finally {
      setBusy(false)
    }
  }

  async function updatePreference(key: 'launchAtLogin', enabled: boolean) {
    if (!stats || busy) return
    setBusy(true)
    try {
      await window.trackerAPI.setLaunchAtLogin(enabled)
      setStats((current) => current ? { ...current, [key]: enabled } : current)
      setError('')
    } catch {
      setError('Could not save this setting.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="loading">Loading your activity...</main>
  if (!stats) return <main className="loading">Activity data is unavailable.</main>

  const today = stats.today
  const applications = stats.applications ?? []
  const totalAppSeconds = applications.reduce((sum, item) => sum + item.seconds, 0)
  const activePage = navigation.find((item) => item.id === page)
  const analyticsDays = (analyticsRange === '7' ? (stats.lastSevenDays ?? []) : (stats.lastThirtyDays ?? [])).slice()
  const previousDays = analyticsDays.slice(0, Math.floor(analyticsDays.length / 2))
  const currentDays = analyticsDays.slice(Math.floor(analyticsDays.length / 2))
  const sumActive = (days: DayStats[]) => days.reduce((sum, day) => sum + day.activeSeconds, 0)
  const currentPeriodSeconds = sumActive(currentDays)
  const previousPeriodSeconds = sumActive(previousDays)
  const periodChange = previousPeriodSeconds > 0 ? ((currentPeriodSeconds - previousPeriodSeconds) / previousPeriodSeconds) * 100 : null
  const appTotals = Object.entries(stats.dailyApplications ?? {}).reduce<Record<string, number>>((totals, [date, items]) => {
    if (analyticsDays.some((day) => day.date === date)) items.forEach((item) => { totals[item.name] = (totals[item.name] ?? 0) + item.seconds })
    return totals
  }, {})
  const rankedApps = Object.entries(appTotals).map(([name, seconds]) => ({ name, seconds })).sort((left, right) => right.seconds - left.seconds)
  const totalPeriodAppSeconds = rankedApps.reduce((sum, item) => sum + item.seconds, 0)
  function updateVisibleCard(key: string, visible: boolean) {
    setVisibleCards((current) => {
      const next = { ...current, [key]: visible }
      try { localStorage.setItem('activity-analytics-cards', JSON.stringify(next)) } catch { /* optional preference */ }
      return next
    })
  }

  return (
    <main className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div className="brand-copy">
            <strong>Activity</strong>
            <span>PERSONAL TRACKER</span>
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-group-label">WORKSPACE</p>
          {navigation.filter((item) => item.group === 'WORKSPACE').map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)} title={collapsed ? item.label : undefined} aria-current={page === item.id ? 'page' : undefined}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
          <p className="nav-group-label preferences-label">PREFERENCES</p>
          {navigation.filter((item) => item.group === 'PREFERENCES').map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)} title={collapsed ? item.label : undefined} aria-current={page === item.id ? 'page' : undefined}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="local-status"><span className="privacy-dot" /><span className="nav-label">Stored locally on this PC</span></div>
          <div className="sidebar-version"><span className="nav-label">Activity Tracker · Personal</span><span className="version-dot">●</span></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{page === 'settings' ? 'MAKE IT YOURS' : page === 'activity' ? 'YOUR TIME, IN CONTEXT' : page === 'analytics' ? 'PATTERNS, NOT GUESSES' : 'YOUR PERSONAL WORKSPACE'}</p>
            <h1>{activePage?.label ?? 'Overview'}</h1>
            <p className="muted">
              {page === 'settings'
                ? 'Keep the tracker working the way you prefer.'
                : page === 'activity'
                  ? 'A focused view of your recorded computer activity.'
                  : page === 'analytics'
                    ? 'Explore application usage, time trends, and period comparisons.'
                    : 'A calm, clear picture of how you spend your computer time.'}
            </p>
          </div>
          <div className="topbar-actions">
            <span className={`tracking-pill ${stats.tracking ? 'is-live' : ''}`}><span />{stats.tracking ? 'Tracking on' : 'Paused'}</span>
            <div className="date-pill">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        {page === 'overview' && (
          <>
            <section className="tracking-card">
              <div className="tracking-copy">
                <div className="live-label"><span className={`status-dot ${stats.tracking ? 'live' : ''}`} />{stats.tracking ? 'TRACKING ENABLED' : 'TRACKING PAUSED'}</div>
                <h2>{stats.tracking ? 'Your activity is being recorded' : 'Ready when you are'}</h2>
                <p>{stats.tracking ? 'Active and idle time are saved on this computer.' : 'Start tracking to collect today’s activity.'}</p>
              </div>
              <button className={`track-button ${stats.tracking ? 'stop' : ''}`} onClick={() => void toggleTracking()} disabled={busy}>
                {busy ? 'Updating...' : stats.tracking ? 'Pause tracking' : 'Start tracking'}
              </button>
            </section>

            <div className="section-heading"><div><h2>Today's summary</h2><p className="muted">Three useful signals, nothing extra.</p></div></div>
            <section className="stats-grid">
              <article className="stat-card"><span className="stat-icon purple">◷</span><p>Active time</p><strong>{formatDuration(today.activeSeconds)}</strong><span className="stat-note">Recent keyboard or mouse activity</span></article>
              <article className="stat-card"><span className="stat-icon blue">◌</span><p>Idle time</p><strong>{formatDuration(today.idleSeconds)}</strong><span className="stat-note">No recent input detected</span></article>
              <article className="stat-card"><span className="stat-icon green">▤</span><p>Recorded time</p><strong>{formatDuration(today.activeSeconds + today.idleSeconds)}</strong><span className="stat-note">Total time while tracking was on</span></article>
            </section>

            <section className="chart-card applications-card">
              <div className="chart-header"><div><h2>Top applications</h2><p className="muted">Where your computer time went today.</p></div><button className="text-button" onClick={() => setPage('activity')}>View activity <span>→</span></button></div>
              {applications.length ? (
                <div className="application-list">
                  {applications.slice(0, 5).map((item) => {
                    const percentage = totalAppSeconds > 0 ? (item.seconds / totalAppSeconds) * 100 : 0
                    return <div className="application-row" key={item.name}><div className="application-info"><span className="application-name" title={item.name}>{item.name}</span><strong>{formatDuration(item.seconds)}</strong></div><div className="application-bar-track"><div className="application-bar" style={{ width: `${Math.min(100, percentage)}%` }} /></div></div>
                  })}
                </div>
              ) : <p className="empty-apps">No application usage recorded yet. Keep tracking enabled while using your usual apps.</p>}
            </section>

            <footer className="privacy-note"><span>🔒</span><div><strong>Your data stays on this computer</strong><p>No activity records are uploaded to a server in this version.</p></div></footer>
          </>
        )}

        {page === 'activity' && (
          <>
            <section className="stats-grid activity-summary">
              <article className="stat-card"><p>Active today</p><strong>{formatDuration(today.activeSeconds)}</strong><span className="stat-note">Time with recent input</span></article>
              <article className="stat-card"><p>Idle today</p><strong>{formatDuration(today.idleSeconds)}</strong><span className="stat-note">Time without recent input</span></article>
              <article className="stat-card"><p>Apps detected</p><strong>{applications.length}</strong><span className="stat-note">Applications recorded today</span></article>
            </section>
            <section className="chart-card">
              <div className="chart-header"><div><h2>Last seven days</h2><p className="muted">Daily active time recorded on this device.</p></div></div>
              <div className="week-list">
                {stats.lastSevenDays.map((day) => {
                  const max = Math.max(1, ...stats.lastSevenDays.map((item) => item.activeSeconds))
                  const width = (day.activeSeconds / max) * 100
                  return <div className="week-row" key={day.date}><span className="week-day">{formatDay(day.date)}</span><div className="week-track"><div className="week-fill" style={{ width: `${width}%` }} /></div><strong>{formatDuration(day.activeSeconds)}</strong></div>
                })}
              </div>
            </section>
            <section className="chart-card">
              <div className="chart-header"><div><h2>Application usage</h2><p className="muted">Ranked by recorded time today.</p></div><span className="app-count">{applications.length} apps</span></div>
              {applications.length ? <div className="application-list">{applications.map((item, index) => {
                const percentage = totalAppSeconds > 0 ? (item.seconds / totalAppSeconds) * 100 : 0
                return <div className="application-row" key={item.name}><div className="application-info"><span className="application-name"><span className="rank-number">{String(index + 1).padStart(2, '0')}</span>{item.name}</span><strong>{formatDuration(item.seconds)}</strong></div><div className="application-bar-track"><div className="application-bar" style={{ width: `${Math.min(100, percentage)}%` }} /></div></div>
              })}</div> : <p className="empty-apps">No application usage recorded yet.</p>}
            </section>
          </>
        )}

        {page === 'analytics' && (
          <>
            <div className="analytics-toolbar">
              <div className="range-control" role="group" aria-label="Analytics date range">
                <button className={analyticsRange === '7' ? 'selected' : ''} onClick={() => setAnalyticsRange('7')}>7 days</button>
                <button className={analyticsRange === '30' ? 'selected' : ''} onClick={() => setAnalyticsRange('30')}>30 days</button>
              </div>
              <button className="customize-button" onClick={() => setShowCustomize((value) => !value)} aria-expanded={showCustomize}>⚙ Customize</button>
            </div>
            {showCustomize && <section className="customize-panel"><strong>Dashboard cards</strong><p className="muted">Choose what appears on this page. Your layout is saved on this PC.</p><div className="customize-options">{[{key:'trend',label:'Usage trend'},{key:'apps',label:'Application breakdown'},{key:'comparison',label:'Period comparison'}].map((item) => <label key={item.key}><input type="checkbox" checked={visibleCards[item.key] !== false} onChange={(event) => updateVisibleCard(item.key, event.target.checked)} />{item.label}</label>)}</div></section>}
            <section className="stats-grid analytics-metrics">
              <article className="stat-card"><span className="stat-icon purple">◷</span><p>Active time</p><strong>{formatDuration(sumActive(analyticsDays))}</strong><span className="stat-note">Across {analyticsDays.length} calendar days</span></article>
              <article className="stat-card"><span className="stat-icon blue">▤</span><p>Applications used</p><strong>{rankedApps.length}</strong><span className="stat-note">Distinct apps with recorded usage</span></article>
              <article className="stat-card"><span className="stat-icon green">↗</span><p>Daily average</p><strong>{formatDuration(analyticsDays.length ? Math.round(sumActive(analyticsDays) / analyticsDays.length) : 0)}</strong><span className="stat-note">Includes days with no recorded activity</span></article>
            </section>
            {visibleCards.trend !== false && <section className="chart-card analytics-chart-card">
              <div className="chart-header"><div><h2>Active time trend</h2><p className="muted">Daily active time. Missing records are displayed as zero, not estimated.</p></div><span className="app-count">{analyticsRange} days</span></div>
              {analyticsDays.length ? <div className="analytics-bars">{analyticsDays.map((day) => { const max = Math.max(1, ...analyticsDays.map((item) => item.activeSeconds)); return <div className="analytics-bar-column" key={day.date} title={day.date + ': ' + formatDuration(day.activeSeconds)}><span className="analytics-bar-value">{day.activeSeconds >= 3600 ? (day.activeSeconds / 3600).toFixed(1) + 'h' : ''}</span><div className="analytics-bar-track"><div className="analytics-bar" style={{ height: (day.activeSeconds / max * 100) + '%' }} /></div><span className="analytics-bar-label">{formatDay(day.date).split(' ')[1] ?? formatDay(day.date)}</span></div>})}</div> : <p className="empty-apps">No daily summaries are available for this range.</p>}
            </section>}
            {visibleCards.comparison !== false && <section className="chart-card comparison-card"><div className="chart-header"><div><h2>Period comparison</h2><p className="muted">First half versus second half of the selected range.</p></div></div><div className="comparison-grid"><div><span>Earlier period</span><strong>{formatDuration(previousPeriodSeconds)}</strong></div><div><span>Later period</span><strong>{formatDuration(currentPeriodSeconds)}</strong></div><div><span>Change</span><strong className={periodChange === null ? '' : periodChange >= 0 ? 'change-up' : 'change-down'}>{periodChange === null ? '—' : (periodChange > 0 ? '+' : '') + periodChange.toFixed(1) + '%'}</strong></div></div>{periodChange === null && <p className="stat-note">A percentage change appears after the earlier period has recorded active time.</p>}</section>}
            {visibleCards.apps !== false && <section className="chart-card"><div className="chart-header"><div><h2>Application breakdown</h2><p className="muted">Combined usage in the selected period, ranked by duration.</p></div><span className="app-count">{rankedApps.length} apps</span></div>{rankedApps.length ? <div className="application-list">{rankedApps.slice(0, 12).map((item, index) => <div className="application-row" key={item.name}><div className="application-info"><span className="application-name"><span className="rank-number">{String(index + 1).padStart(2, '0')}</span>{item.name}</span><strong>{formatDuration(item.seconds)}</strong></div><div className="application-bar-track"><div className="application-bar" style={{ width: (totalPeriodAppSeconds ? Math.min(100, item.seconds / totalPeriodAppSeconds * 100) : 0) + '%' }} /></div></div>)}</div> : <p className="empty-apps">No application usage recorded in this period yet.</p>}</section>}
            <footer className="privacy-note"><span>🔒</span><div><strong>Analytics are calculated locally</strong><p>These charts use locally stored daily totals and app usage. They do not infer exact hourly sessions or app-switch counts.</p></div></footer>
          </>
        )}

        {page === 'settings' && (
          <section className="settings-stack">
            <div className="settings-intro"><div className="settings-icon">⚙</div><div><h2>Preferences</h2><p className="muted">Small controls to make the tracker fit your workflow.</p></div></div>
            <article className="setting-row"><div className="setting-copy"><strong>Launch with Windows</strong><p>Start the tracker when you sign in to your PC.</p></div><button role="switch" aria-checked={stats.launchAtLogin} className={`switch ${stats.launchAtLogin ? 'on' : ''}`} disabled={busy} onClick={() => void updatePreference('launchAtLogin', !stats.launchAtLogin)}><span /></button></article>
            <article className="setting-row"><div className="setting-copy"><strong>Global shortcut</strong><p>Show or hide the dashboard from any app.</p></div><kbd>Ctrl</kbd><span className="key-plus">+</span><kbd>Shift</kbd><span className="key-plus">+</span><kbd>Space</kbd></article>
            <div className="privacy-panel"><span>◈</span><div><strong>Local-first by design</strong><p>Your activity data and preferences are stored on this PC. This screen doesn't send them anywhere.</p></div></div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
