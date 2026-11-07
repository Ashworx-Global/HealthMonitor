import { expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Encoder, Profile } from '@garmin/fitsdk'
import { verifyReadonly } from './verify-readonly'
it('imports to mounted archive and verifies original watch bytes and day artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'garmin-verify-'))
  try {
    const device = join(root, 'device'), archive = join(root, 'drive', 'GarminData')
    await mkdir(join(device, 'GARMIN', 'Activity'), { recursive: true }); await mkdir(join(root, 'drive'))
    const encoder = new Encoder()
    encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: 'development', product: 1, type: 'activity', timeCreated: new Date('2026-11-07T06:00:00Z') } as never)
    encoder.onMesg(Profile.MesgNum.SESSION, { sport: 'cycling', startTime: new Date('2026-11-07T06:00:00Z'), totalTimerTime: 500, totalDistance: 1000 } as never)
    await writeFile(join(device, 'GARMIN', 'Activity', 'ride.fit'), encoder.close())
    const report = await verifyReadonly(device, archive, join(root, 'staging'), 'Africa/Johannesburg')
    expect(report.watchUnchanged).toBe(true)
    expect(report.days).toContain('2026-11-07')
    expect(report.missingArtifacts).toEqual([])
  } finally { await rm(root, { recursive: true, force: true }) }
})
it('reports pending instead of claiming backup when Drive is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'garmin-verify-'))
  try {
    const device = join(root, 'device'); await mkdir(join(device, 'GARMIN', 'Activity'), { recursive: true })
    const encoder = new Encoder()
    encoder.onMesg(Profile.MesgNum.FILE_ID, { manufacturer: 'development', product: 1, type: 'activity', timeCreated: new Date('2026-11-07T06:00:00Z') } as never)
    await writeFile(join(device, 'GARMIN', 'Activity', 'ride.fit'), encoder.close())
    const report = await verifyReadonly(device, join(root, 'missing-drive', 'GarminData'), join(root, 'stage'), 'Africa/Johannesburg')
    expect(report.cloudSyncConfirmed).toBe(false)
    expect(report.pending).toBeGreaterThan(0)
  } finally { await rm(root, { recursive: true, force: true }) }
})
