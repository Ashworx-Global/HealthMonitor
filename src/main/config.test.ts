import { afterEach, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from './config'

const dirs: string[] = []
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }) })

it('defaults to mounted Drive without creating it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'garmin-config-')); dirs.push(dir)
  const config = await loadConfig(dir)
  expect(config.archiveRoot).toBe('G:\\My Drive\\GarminData')
  expect(config.stagingRoot).toBe(join(dir, 'staging'))
  expect(config.timeZone).toBeTruthy()
})

it('loads overrides without accepting a raw API secret in settings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'garmin-config-')); dirs.push(dir)
  await writeFile(join(dir, 'settings.json'), JSON.stringify({ archiveRoot: 'X:\\Archive', timeZone: 'Africa/Johannesburg', ai: { endpoint: 'https://example.com/v1/chat/completions', model: 'example', keyRef: 'GARMIN_AI_KEY', apiKey: 'secret' } }))
  const config = await loadConfig(dir)
  expect(config.archiveRoot).toBe('X:\\Archive')
  expect(config.timeZone).toBe('Africa/Johannesburg')
  expect(JSON.stringify(config)).not.toContain('secret')
})
