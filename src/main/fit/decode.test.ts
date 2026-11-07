import { expect, it } from 'vitest'
import { Encoder, Profile } from '@garmin/fitsdk'
import { decodeFit } from './decode'
import type { SourceRef } from '../../shared/archive'

const source: SourceRef = { sha256: 'abc', sourcePath: 'Activity/test.fit', originalName: 'test.fit', kind: 'Activity' }
function fixture(messages: { num: number; fields: Record<string, unknown> }[]): Uint8Array {
  const encoder = new Encoder()
  encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: 'development', product: 1, type: 'activity', timeCreated: new Date('2026-11-07T06:00:00Z') } as never)
  for (const { num, fields } of messages) encoder.onMesg(num, fields as never)
  return encoder.close()
}

it('extracts a cycling session with source provenance', () => {
  const bytes = fixture([{ num: Profile.MesgNum.SESSION, fields: { sport: 'cycling', startTime: new Date('2026-11-07T06:15:29Z'), totalTimerTime: 3769, totalDistance: 13317.11, avgHeartRate: 152, totalCalories: 746 } }])
  const result = decodeFit(bytes, source)
  expect(result.activities[0]).toMatchObject({ sport: 'cycling', distanceMeters: 13317.11, avgHeartRateBpm: 152, calories: 746, sourceHash: 'abc' })
  expect(result.coverage).toContainEqual({ kind: 'activity', state: 'available' })
})

it('marks sleep as unsupported instead of fabricating zero sleep', () => {
  const result = decodeFit(fixture([]), { ...source, kind: 'Sleep' })
  expect(result.health).toEqual([])
  expect(result.coverage).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'sleep', state: 'unsupported' })]))
})

it('extracts recognized monitoring metrics only', () => {
  const bytes = fixture([{ num: Profile.MesgNum.MONITORING, fields: { timestamp: new Date('2026-11-07T06:00:00Z'), activeCalories: 14, cycles: 22 } }])
  const result = decodeFit(bytes, { ...source, kind: 'Monitor' })
  expect(result.health).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'active_calories', value: 14, unit: 'kcal' })]))
  expect(result.health.find(m => m.kind === 'sleep_minutes')).toBeUndefined()
})
it('excludes Garmin negative stress sentinel values from health charts', () => {
  const bytes = fixture([
    { num: Profile.MesgNum.STRESS_LEVEL, fields: { stressLevelTime: new Date('2026-11-07T06:00:00Z'), stressLevelValue: -2 } },
    { num: Profile.MesgNum.STRESS_LEVEL, fields: { stressLevelTime: new Date('2026-11-07T06:01:00Z'), stressLevelValue: 45 } },
  ])
  expect(decodeFit(bytes, { ...source, kind: 'Monitor' }).health.filter(h => h.kind === 'stress').map(h => h.value)).toEqual([45])
})
it('extracts valid resting heart rate and respiration while excluding negative sentinels', () => {
  const bytes = fixture([
    { num: Profile.MesgNum.MONITORING_HR_DATA, fields: { timestamp: new Date('2026-11-07T06:00:00Z'), restingHeartRate: 54, currentDayRestingHeartRate: 58 } },
    { num: Profile.MesgNum.RESPIRATION_RATE, fields: { timestamp: new Date('2026-11-07T06:01:00Z'), respirationRate: -1 } },
    { num: Profile.MesgNum.RESPIRATION_RATE, fields: { timestamp: new Date('2026-11-07T06:02:00Z'), respirationRate: 15 } },
  ])
  const health = decodeFit(bytes, { ...source, kind: 'Monitor' }).health
  expect(health).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'resting_heart_rate', value: 54, unit: 'bpm' }),
    expect.objectContaining({ kind: 'current_day_resting_heart_rate', value: 58, unit: 'bpm' }),
    expect.objectContaining({ kind: 'respiration_rate', value: 15, unit: 'breaths/min' }),
  ]))
  expect(health.filter(h => h.kind === 'respiration_rate').map(h => h.value)).toEqual([15])
})
