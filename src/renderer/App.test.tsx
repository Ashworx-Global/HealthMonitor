import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Dashboard } from './App'
import type { DayData } from '../shared/archive'
const day: DayData = { schemaVersion: 1, day: '2026-11-07', activities: [], health: [], coverage: [{ kind: 'sleep_duration', state: 'unsupported' }], observations: [{ timestamp: '2026-11-07T06:00:00Z', kind: 'sleep_level:awake', value: 1, unit: 'event' }], sources: [{ sha256: 'abc', originalName: 'ride.fit', kind: 'Activity', sourcePath: 'GARMIN/Activity/ride.fit' }] }
it('shows archive unavailable without pretending local staged files are loaded', () => {
  const html = renderToStaticMarkup(<Dashboard days={[]} selected={null} summary={null} status={{ archiveRoot: 'G:\\My Drive\\GarminData', archiveAvailable: false, watchRoot: null, lastImport: null, cloudSyncConfirmed: false }} error="Drive archive unavailable" onSelect={() => {}} onImport={() => {}} />)
  expect(html).toContain('Drive archive unavailable')
  expect(html).not.toContain('Synced to Google')
  expect(html).not.toContain('Saved to mounted Drive')
})
it('shows day source and Markdown alongside unverified cloud-sync status', () => {
  const html = renderToStaticMarkup(<Dashboard days={[day]} selected={day} summary="# My ride" status={{ archiveRoot: 'G:\\My Drive\\GarminData', archiveAvailable: true, watchRoot: 'E:\\', lastImport: { imported: 1, unchanged: 0, pending: 0, errors: [] }, cloudSyncConfirmed: false }} error={null} onSelect={() => {}} onImport={() => {}} />)
  expect(html).toContain('ride.fit')
  expect(html).toContain('My ride')
  expect(html).toContain('Cloud sync not verified')
  expect(html).toContain('Settings')
  expect(html).toContain('sleep-level event')
})
