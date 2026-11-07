import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ArchiveConfig } from '../shared/archive'

export async function loadConfig(userData: string): Promise<ArchiveConfig> {
  let settings: Record<string, unknown> = {}
  try { settings = JSON.parse(await readFile(join(userData, 'settings.json'), 'utf8')) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const ai = settings.ai && typeof settings.ai === 'object' ? settings.ai as Record<string, unknown> : undefined
  const config: ArchiveConfig = {
    archiveRoot: typeof settings.archiveRoot === 'string' ? settings.archiveRoot : 'G:\\My Drive\\GarminData',
    stagingRoot: join(userData, 'staging'),
    timeZone: typeof settings.timeZone === 'string' ? settings.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  if (ai && typeof ai.endpoint === 'string' && typeof ai.model === 'string' && typeof ai.keyRef === 'string')
    config.ai = { endpoint: ai.endpoint, model: ai.model, keyRef: ai.keyRef }
  return config
}

export async function saveConfig(userData: string, config: ArchiveConfig): Promise<void> {
  const { archiveRoot, timeZone, ai } = config
  await writeFile(join(userData, 'settings.json'), JSON.stringify({ archiveRoot, timeZone, ai }, null, 2))
}
