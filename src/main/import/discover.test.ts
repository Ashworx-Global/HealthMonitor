import { expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { discoverFitFiles } from './discover'
it('discovers FIT files in relevant watch folders without unrelated files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'garmin-discover-'))
  try {
    await mkdir(join(root, 'GARMIN', 'Sleep'), { recursive: true })
    await writeFile(join(root, 'GARMIN', 'Sleep', 'sleep.FIT'), 'fit')
    await writeFile(join(root, 'GARMIN', 'Sleep', 'readme.txt'), 'text')
    expect((await discoverFitFiles(root)).map(p => p.split(/[\\/]/).pop())).toEqual(['sleep.FIT'])
  } finally { await rm(root, { recursive: true, force: true }) }
})
