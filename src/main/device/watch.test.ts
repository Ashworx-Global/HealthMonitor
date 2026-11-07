import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findGarminVolumes, startDeviceWatcher } from './watch'

const dirs: string[] = []
afterEach(async () => { vi.useRealTimers(); for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }) })
it('ignores unrelated volumes and finds a relocated Garmin', async () => {
  const root = await mkdtemp(join(tmpdir(), 'garmin-watch-')); dirs.push(root)
  const watch = join(root, 'watch'); const other = join(root, 'other')
  await mkdir(join(watch, 'GARMIN', 'Activity'), { recursive: true }); await mkdir(other)
  expect(await findGarminVolumes([other, watch])).toEqual([watch])
})
it('imports an already-attached watch once despite repeat scans', async () => {
  vi.useFakeTimers()
  const onFound = vi.fn(async () => {})
  const stop = startDeviceWatcher(onFound, { roots: async () => ['X:\\'], identify: async roots => roots, intervalMs: 1000 })
  await vi.advanceTimersByTimeAsync(3100)
  expect(onFound).toHaveBeenCalledTimes(1)
  stop()
})
