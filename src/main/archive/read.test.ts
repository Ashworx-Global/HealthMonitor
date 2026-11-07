import { expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { listDays, readDay } from './read'
it('lists only valid days and rejects path traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'garmin-read-'))
  try {
    const day = join(root, '2026', '11', '07', 'data'); await mkdir(day, { recursive: true })
    await writeFile(join(day, 'day.json'), JSON.stringify({ schemaVersion: 1, day: '2026-11-07', activities: [], health: [], sources: [], coverage: [] }))
    expect(await listDays(root)).toEqual(['2026-11-07'])
    expect((await readDay(root, '2026-11-07'))?.day).toBe('2026-11-07')
    await expect(readDay(root, '../../x')).rejects.toThrow()
  } finally { await rm(root, { recursive: true, force: true }) }
})
