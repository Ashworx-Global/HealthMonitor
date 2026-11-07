import { useCallback, useEffect, useState } from 'react'
import type { ArchiveConfig, DayData, ImportReport } from '../shared/archive'
import { ActivityChart } from './components/ActivityChart'
import { HealthChart } from './components/HealthChart'
import { activitySeries, healthSeries } from './metrics'

interface Status { archiveRoot: string; archiveAvailable: boolean; watchRoot: string | null; lastImport: ImportReport | null; cloudSyncConfirmed: false }
interface DashboardProps { days: DayData[]; selected: DayData | null; summary: string | null; status: Status | null; error: string | null; onSelect: (day: string) => void; onImport: () => void; onSettings?: () => void }
export function Dashboard({ days, selected, summary, status, error, onSelect, onImport, onSettings }: DashboardProps) {
  const distance = days.reduce((sum, day) => sum + day.activities.reduce((n, a) => n + (a.distanceMeters ?? 0), 0), 0) / 1000
  const activities = days.reduce((sum, day) => sum + day.activities.length, 0)
  const heart = healthSeries(days, 'stress')
  const latest = days[0]?.day
  return <div className="app-shell">
    <aside className="sidebar"><div className="logo"><span className="logo-mark">◈</span><span>Garmin<span className="logo-light">Data</span></span></div>
      <div className="sidebar-label">YOUR ARCHIVE</div><div className="nav-active">◫ &nbsp; Overview</div>
      <div className="sidebar-label days-label">RECENT DAYS</div><nav aria-label="Archived days">{days.slice(0, 35).map(day => <button className={selected?.day === day.day ? 'day-link active' : 'day-link'} key={day.day} onClick={() => onSelect(day.day)}><span>◷</span>{day.day}<small>{day.activities.length ? `${day.activities.length} activities` : 'health data'}</small></button>)}</nav>
      <div className="sidebar-foot"><div className="drive-dot"/> OWNED BY YOU <small>Files live in your Google Drive folder.</small></div>
    </aside>
    <main className="content"><header className="topbar"><div><div className="eyebrow">PERSONAL HEALTH ARCHIVE / OVERVIEW</div><h1>Your data, your story<span className="accent">.</span></h1><p className="lede">A clearer view of the days you moved, rested, and kept going.</p></div><div className="header-actions"><button className="settings-button" onClick={onSettings}>⚙ Settings</button><button className="import-button" onClick={onImport}>↧ &nbsp; Import watch</button></div></header>
      <div className="status-row"><span className="pill">{status?.watchRoot ? '● Watch connected' : '○ Watch not connected'}</span><span className="pill muted">{status?.archiveAvailable ? '◇ Saved to mounted Drive · Cloud sync not verified' : '◇ Drive archive unavailable · Cloud sync not verified'}</span><span className="archive-path" title={status?.archiveRoot}>⌁ {status?.archiveRoot ?? 'Loading archive…'}</span></div>
      {error && <div className="error" role="alert">{error}</div>}
      {status?.lastImport && <div className="import-status">Last import: {status.lastImport.imported} new, {status.lastImport.unchanged} unchanged, {status.lastImport.pending} pending{status.lastImport.errors.length ? ` · ${status.lastImport.errors.length} errors` : ''}.</div>}
      <section className="metrics-grid" aria-label="Archive highlights"><div className="metric-card"><span>ARCHIVED DAYS</span><strong>{days.length}</strong><small>Days in your Drive archive</small></div><div className="metric-card"><span>TOTAL ACTIVITIES</span><strong>{activities}</strong><small>Recorded sessions</small></div><div className="metric-card"><span>DISTANCE RECORDED</span><strong>{distance.toFixed(1)} <em>km</em></strong><small>Across archived activities</small></div><div className="metric-card"><span>MOST RECENT</span><strong className="metric-date">{latest?.slice(5) ?? '—'}</strong><small>{latest ?? 'No archive data yet'}</small></div></section>
      <div className="two-column"><section className="panel"><div className="panel-head"><div><span className="section-kicker">ACTIVITY / TRENDS</span><h2>Distance over time</h2></div><span className="panel-unit">kilometers</span></div>{days.length ? <ActivityChart data={activitySeries(days)} /> : <div className="empty-chart">Import your watch to see your activity trend.</div>}</section>
        <section className="panel"><div className="panel-head"><div><span className="section-kicker">HEALTH / COVERAGE</span><h2>Stress readings</h2></div><span className="panel-unit">available data only</span></div>{heart.some(p => p.value !== null) ? <HealthChart data={heart} label="Stress reading" /> : <div className="empty-chart">No verified stress values in this archive yet. Missing values are not zero.</div>}<p className="coverage-note">Sleep and health data appear only when the FIT files contain metrics we can verify.</p></section></div>
      <section className="panel daily-panel"><div className="panel-head"><div><span className="section-kicker">DAILY JOURNAL</span><h2>{selected ? selected.day : 'Select a day'}</h2></div><span className="panel-unit">source-backed</span></div>
        {selected ? <div className="daily-columns"><div><h3>Recorded on this day</h3>{selected.activities.length ? selected.activities.map(a => <div className="activity-entry" key={a.id}><strong>{a.sport}</strong><span>{a.distanceMeters === undefined ? 'Distance unavailable' : `${(a.distanceMeters / 1000).toFixed(2)} km`} · {(a.durationSeconds / 60).toFixed(0)} min</span></div>) : <p className="subtle">No activities in these files.</p>}
          <h3>Data coverage</h3>{selected.coverage.length ? selected.coverage.map((c, i) => <div className="coverage-entry" key={`${c.kind}-${i}`}>{c.kind.replaceAll('_', ' ')} <span>{c.state}</span></div>) : <p className="subtle">No health records extracted.</p>}
          {!!selected.observations?.filter(o => o.kind.startsWith('sleep_level:')).length && <p className="subtle">{selected.observations.filter(o => o.kind.startsWith('sleep_level:')).length} sleep-level event(s) decoded · not a verified total sleep duration.</p>}
          <h3>Original FIT backups</h3>{selected.sources.map(s => <div className="source-entry" key={s.sha256} title={s.sourcePath}>{s.originalName}<small>{s.kind} · SHA-256 {s.sha256.slice(0, 12)}…</small></div>)}</div>
          <div><h3>Markdown summary</h3><pre className="summary">{summary ?? 'No summary saved for this day yet.'}</pre></div></div> : <div className="empty-chart">Your day-by-day story will appear here once the archive is available.</div>}</section>
      <footer>GarminData · Local-first archive · Not medical advice · Cloud sync is managed by Google Drive for desktop.</footer>
    </main></div>
}

export default function App() {
  const [days, setDays] = useState<DayData[]>([])
  const [selected, setSelected] = useState<DayData | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<ArchiveConfig | null>(null)
  const reload = useCallback(async (selectedDay?: string) => {
    try {
      const current = await window.garmin.status(); setStatus(current)
      if (!current.archiveAvailable) { setError('Drive archive unavailable. Connect Google Drive or import the watch to create GarminData.'); setDays([]); setSelected(null); setSummary(null); return }
      const names = await window.garmin.listDays()
      const items = (await Promise.all(names.map(day => window.garmin.readDay(day)))).filter((d): d is DayData => d !== null)
      setDays(items); const day = selectedDay ?? items[0]?.day
      setSelected(items.find(d => d.day === day) ?? null)
      setSummary(day ? await window.garmin.readSummary(day) : null)
      setError(null)
    } catch (cause) { setError(`Drive archive unavailable: ${String(cause)}`); setDays([]); setSelected(null); setSummary(null) }
  }, [])
  useEffect(() => { void reload(); const timer = setInterval(() => void reload(), 30000); return () => clearInterval(timer) }, [reload])
  const onImport = async () => { try { await window.garmin.importNow(); await reload(selected?.day) } catch (cause) { setError(String(cause)) } }
  const save = async () => { if (!settings) return; try { await window.garmin.saveSettings({ archiveRoot: settings.archiveRoot, timeZone: settings.timeZone, ai: settings.ai?.endpoint ? settings.ai : undefined }); setSettings(null); await reload() } catch (cause) { setError(String(cause)) } }
  return <><Dashboard days={days} selected={selected} summary={summary} status={status} error={error} onSelect={day => { void reload(day) }} onImport={() => { void onImport() }} onSettings={() => { void window.garmin.settings().then(setSettings).catch(cause => setError(String(cause))) }}/>
    {settings && <div className="modal-backdrop" role="presentation"><section className="settings-dialog" role="dialog" aria-label="Settings"><h2>Archive settings</h2><p>Your FIT and JSON files remain in the folder you choose. AI is optional.</p><label>Archive folder<input value={settings.archiveRoot} onChange={e => setSettings({ ...settings, archiveRoot: e.target.value })}/></label><label>Device-local timezone (IANA)<input value={settings.timeZone} onChange={e => setSettings({ ...settings, timeZone: e.target.value })}/></label><label>AI endpoint (HTTPS, optional)<input value={settings.ai?.endpoint ?? ''} onChange={e => setSettings({ ...settings, ai: { endpoint: e.target.value, model: settings.ai?.model ?? '', keyRef: settings.ai?.keyRef ?? '' } })}/></label><label>AI model<input value={settings.ai?.model ?? ''} onChange={e => setSettings({ ...settings, ai: { endpoint: settings.ai?.endpoint ?? '', model: e.target.value, keyRef: settings.ai?.keyRef ?? '' } })}/></label><label>API key environment variable name<input value={settings.ai?.keyRef ?? ''} onChange={e => setSettings({ ...settings, ai: { endpoint: settings.ai?.endpoint ?? '', model: settings.ai?.model ?? '', keyRef: e.target.value } })}/></label><div className="dialog-actions"><button onClick={() => setSettings(null)}>Cancel</button><button onClick={() => { void save() }}>Save settings</button></div><small>Set the key as a Windows environment variable; never paste it into this app. Mounted Drive writes do not verify cloud sync.</small></section></div>}
  </>
}
