import { expect, it } from 'vitest'
import { activitySeries, healthSeries } from './metrics'
import type { DayData } from '../shared/archive'
const base: DayData = { schemaVersion: 1, day: '2026-11-07', activities: [{ id: 'ride', sport: 'cycling', startedAt: '2026-11-07T06:15:29Z', durationSeconds: 3000, distanceMeters: 13317.11 }], health: [], coverage: [{ kind: 'sleep_duration', state: 'unsupported' }], sources: [] }
it('sorts distance by day in km', () => {
  expect(activitySeries([{ ...base, day: '2026-11-08', activities: [{ ...base.activities[0], distanceMeters: 20000 }] }, base]).map(p => [p.day, p.value])).toEqual([['2026-11-07', 13.32], ['2026-11-08', 20]])
})
it('represents unavailable sleep as a gap, not zero', () => {
  expect(healthSeries([base], 'sleep_duration')[0].value).toBeNull()
})
