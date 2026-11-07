import { expect, it } from 'vitest'
import { dayForInstant, daysForFit } from './day'
import type { DecodedFit } from './decode'

it('maps an overnight UTC instant to its local day', () => {
  expect(dayForInstant('2026-11-07T23:30:00Z', 'Africa/Johannesburg')).toBe('2026-11-08')
})
it('maps DST transition by instant, not a guessed offset', () => {
  expect(dayForInstant('2026-11-01T05:30:00Z', 'America/New_York')).toBe('2026-11-01')
  expect(dayForInstant('2026-11-01T06:30:00Z', 'America/New_York')).toBe('2026-11-01')
})
it('includes both local days of a spanning activity', () => {
  const decoded = { activities: [{ id: 'ride', sport: 'cycling', startedAt: '2026-11-07T21:30:00Z', durationSeconds: 7200 }], health: [], observations: [], coverage: [], source: { sha256: 'abc', sourcePath: 'test.fit', originalName: 'test.fit', kind: 'Activity' } } as DecodedFit
  expect(daysForFit(decoded, 'Africa/Johannesburg')).toEqual(['2026-11-07', '2026-11-08'])
})
