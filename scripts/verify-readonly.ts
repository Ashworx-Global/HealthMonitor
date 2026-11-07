import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { discoverFitFiles } from '../src/main/import/discover'
import { importDevice } from '../src/main/import/importer'
import { dayFolder, listDays } from '../src/main/archive/read'

interface VerificationReport { watchUnchanged: boolean; days: string[]; missingArtifacts: string[]; imported: number; pending: number; errors: string[]; cloudSyncConfirmed: false }
async function snapshot(root: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  for (const path of await discoverFitFiles(root)) result.set(path, createHash('sha256').update(await readFile(path)).digest('hex'))
  return result
}
export async function verifyReadonly(deviceRoot: string, archiveRoot: string, stagingRoot: string, timeZone: string): Promise<VerificationReport> {
  const before = await snapshot(deviceRoot)
  if (!before.size) throw new Error('No FIT files found on Garmin device; refusing to import')
  const importResult = await importDevice(deviceRoot, { archiveRoot, stagingRoot, timeZone })
  const after = await snapshot(deviceRoot)
  const days = await listDays(archiveRoot)
  const missingArtifacts: string[] = []
  for (const day of days) for (const name of ['manifest.json', 'summary.md', join('data', 'day.json')]) {
    const path = join(dayFolder(archiveRoot, day), name)
    if (!await stat(path).then(s => s.isFile()).catch(() => false)) missingArtifacts.push(path)
  }
  return { watchUnchanged: before.size === after.size && [...before].every(([path, hash]) => after.get(path) === hash), days, missingArtifacts, imported: importResult.imported, pending: importResult.pending, errors: importResult.errors, cloudSyncConfirmed: false }
}
