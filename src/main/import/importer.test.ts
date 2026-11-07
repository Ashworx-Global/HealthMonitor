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
  expect((await importDevice(device, config)).unchanged).toBe(1)
  expect((await readdir(join(day, 'raw'))).length).toBe(1)
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
