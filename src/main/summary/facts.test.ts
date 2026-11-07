import { expect, it } from 'vitest'
import { buildFacts } from './facts'
import type { DayData } from '../../shared/archive'
const day: DayData = {
  schemaVersion: 1, day: '2026-11-07', activities: [{ id: 'ride', sport: 'cycling', startedAt: '2026-11-07T06:15:29Z', durationSeconds: 3769, distanceMeters: 13317.11, avgHeartRateBpm: 152, sourceHash: 'abc' }],
  health: [], sources: [{ sha256: 'abc', sourcePath: 'GARMIN/Activity/test.fit', originalName: 'test.fit', kind: 'Activity' }],
  coverage: [{ kind: 'sleep_duration', state: 'unsupported', reason: 'No verified duration in source' }],
}
it('summarizes cycling with units and source but no invented sleep duration', () => {
  const result = buildFacts(day, [])
  expect(result).toContain('13.32 km')
  expect(result).toContain('152 bpm')
  expect(result).toContain('test.fit')
  expect(result).toContain('sleep_duration: unsupported')
  expect(result).not.toContain('0 hours')
})
it('compares the current day against available history only', () => {
  const history = Array.from({ length: 6 }, (_, i) => ({ ...day, day: `2026-11-0${i + 1}`, activities: [{ ...day.activities[0], distanceMeters: 10000 }] }))
  expect(buildFacts(day, history)).toContain('10.00 km')
})
