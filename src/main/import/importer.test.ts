import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Encoder, Profile } from '@garmin/fitsdk'
import { importDevice } from './importer'
import type { ArchiveConfig } from '../../shared/archive'

const dirs: string[] = []
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }) })
async function setup(): Promise<{ device: string; config: ArchiveConfig }> {
  const root = await mkdtemp(join(tmpdir(), 'garmin-import-')); dirs.push(root)
  const device = join(root, 'device'); await mkdir(join(device, 'GARMIN', 'Activity'), { recursive: true })
  return { device, config: { archiveRoot: join(root, 'drive', 'GarminData'), stagingRoot: join(root, 'stage'), timeZone: 'Africa/Johannesburg' } }
}
async function putRide(device: string, name = 'test.fit', start = '2026-11-07T06:15:29Z'): Promise<void> {
  const encoder = new Encoder()
  encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: 'development', product: 1, type: 'activity', timeCreated: new Date(start) } as never)
  encoder.onMesg(Profile.MesgNum.SESSION, { sport: 'cycling', startTime: new Date(start), totalTimerTime: 7200, totalDistance: 12000 } as never)
  await writeFile(join(device, 'GARMIN', 'Activity', name), encoder.close())
}
it('archives original bytes, daily JSON and manifest and skips re-import', async () => {
  const { device, config } = await setup(); await putRide(device); await mkdir(config.archiveRoot, { recursive: true })
  expect((await importDevice(device, config)).imported).toBe(1)
  const day = join(config.archiveRoot, '2026', '11', '07')
  expect((await readdir(join(day, 'raw'))).length).toBe(1)
  expect((await readdir(join(day, 'data'))).length).toBe(1)
  expect(JSON.parse(await readFile(join(day, 'data', 'day.json'), 'utf8')).activities[0].sport).toBe('cycling')
  expect(await readFile(join(day, 'summary.md'), 'utf8')).toContain('12.00 km')
  expect((await importDevice(device, config)).unchanged).toBe(1)
  expect((await readdir(join(day, 'raw'))).length).toBe(1)
})
it('serializes simultaneous automatic and manual imports without duplicating a ride', async () => {
  const { device, config } = await setup(); await putRide(device); await mkdir(config.archiveRoot, { recursive: true })
  const other = join(device, '..', 'second-device'); await mkdir(join(other, 'GARMIN', 'Activity'), { recursive: true })
  await putRide(other, 'other.fit', '2026-11-07T09:15:29Z')
  await Promise.all([importDevice(device, config), importDevice(other, config)])
  const data = JSON.parse(await readFile(join(config.archiveRoot, '2026', '11', '07', 'data', 'day.json'), 'utf8'))
  expect(data.activities).toHaveLength(2)
  expect(data.sources).toHaveLength(2)
})
it('archives a ride that crosses local midnight in both days', async () => {
  const { device, config } = await setup(); await putRide(device, 'overnight.fit', '2026-11-07T21:30:00Z'); await mkdir(config.archiveRoot, { recursive: true })
  await importDevice(device, config)
  for (const day of ['07', '08']) expect((await readdir(join(config.archiveRoot, '2026', '11', day, 'raw'))).length).toBe(1)
})
it('creates GarminData when the parent Drive mount exists', async () => {
  const { device, config } = await setup(); await putRide(device)
  await mkdir(join(config.archiveRoot, '..'), { recursive: true })
  expect((await importDevice(device, config)).imported).toBe(1)
  expect((await readdir(join(config.archiveRoot, '2026', '11', '07', 'raw'))).length).toBe(1)
})
it('repairs a missing summary after an interrupted day write', async () => {
  const { device, config } = await setup(); await putRide(device); await mkdir(config.archiveRoot, { recursive: true })
  await importDevice(device, config)
  const summary = join(config.archiveRoot, '2026', '11', '07', 'summary.md')
  await rm(summary)
  await importDevice(device, config)
  expect(await readFile(summary, 'utf8')).toContain('12.00 km')
})
it('removes previously archived negative stress sentinel values on re-import', async () => {
  const { device, config } = await setup(); await putRide(device); await mkdir(config.archiveRoot, { recursive: true })
  await importDevice(device, config)
  const dataPath = join(config.archiveRoot, '2026', '11', '07', 'data', 'day.json')
  const data = JSON.parse(await readFile(dataPath, 'utf8'))
  data.health.push({ kind: 'stress', timestamp: '2026-11-07T06:00:00Z', value: -2, unit: 'score', sourceHash: data.sources[0].sha256 })
  await writeFile(dataPath, JSON.stringify(data))
  await importDevice(device, config)
  expect(JSON.parse(await readFile(dataPath, 'utf8')).health).toEqual([])
})
it('backfills newly supported heart metrics into an existing day without duplicating sources', async () => {
  const { device, config } = await setup(); await mkdir(join(device, 'GARMIN', 'Monitor'), { recursive: true }); await mkdir(config.archiveRoot, { recursive: true })
  const encoder = new Encoder()
  encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: 'development', product: 1, type: 'activity', timeCreated: new Date('2026-11-07T06:00:00Z') } as never)
  encoder.onMesg(Profile.MesgNum.MONITORING_HR_DATA, { timestamp: new Date('2026-11-07T06:00:00Z'), restingHeartRate: 54 } as never)
  await writeFile(join(device, 'GARMIN', 'Monitor', 'heart.fit'), encoder.close())
  await importDevice(device, config)
  const file = join(config.archiveRoot, '2026', '11', '07', 'data', 'day.json')
  const data = JSON.parse(await readFile(file, 'utf8'))
  data.health = []; await writeFile(file, JSON.stringify(data))
  await importDevice(device, config)
  const restored = JSON.parse(await readFile(file, 'utf8'))
  expect(restored.health).toEqual([expect.objectContaining({ kind: 'resting_heart_rate', value: 54 })])
  expect(restored.sources).toHaveLength(1)
})
it('preserves staged data when Drive is unavailable then resumes', async () => {
  const { device, config } = await setup(); await putRide(device)
  expect((await importDevice(device, config)).pending).toBe(1)
  expect((await readdir(config.stagingRoot)).some(name => name.endsWith('.fit'))).toBe(true)
  await mkdir(config.archiveRoot, { recursive: true })
  expect((await importDevice(device, config)).imported).toBe(1)
})
it('does not overwrite malformed day JSON', async () => {
  const { device, config } = await setup(); await putRide(device)
  const day = join(config.archiveRoot, '2026', '11', '07'); await mkdir(join(day, 'data'), { recursive: true })
  await writeFile(join(day, 'data', 'day.json'), 'not-json')
  expect((await importDevice(device, config)).errors).not.toEqual([])
  expect(await readFile(join(day, 'data', 'day.json'), 'utf8')).toBe('not-json')
})
it('stores decoded sleep-level events in daily JSON without inventing duration', async () => {
  const { device, config } = await setup()
  await mkdir(join(device, 'GARMIN', 'Sleep'), { recursive: true }); await mkdir(config.archiveRoot, { recursive: true })
  const encoder = new Encoder()
  encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: 'development', product: 1, type: 'activity', timeCreated: new Date('2026-11-07T06:00:00Z') } as never)
  encoder.onMesg(Profile.MesgNum.SLEEP_LEVEL, { timestamp: new Date('2026-11-07T06:00:00Z'), sleepLevel: 'awake' } as never)
  await writeFile(join(device, 'GARMIN', 'Sleep', 'sleep.fit'), encoder.close())
  await importDevice(device, config)
  const data = JSON.parse(await readFile(join(config.archiveRoot, '2026', '11', '07', 'data', 'day.json'), 'utf8'))
  expect(data.observations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'sleep_level:awake' })]))
  expect(data.health.find((metric: { kind: string }) => metric.kind === 'sleep_duration')).toBeUndefined()
  delete data.observations
  await writeFile(join(config.archiveRoot, '2026', '11', '07', 'data', 'day.json'), JSON.stringify(data))
  await importDevice(device, config)
  const restored = JSON.parse(await readFile(join(config.archiveRoot, '2026', '11', '07', 'data', 'day.json'), 'utf8'))
  expect(restored.observations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'sleep_level:awake' })]))
})
