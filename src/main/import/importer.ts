import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, sep } from 'node:path'
import type { ArchiveConfig, DayData, ImportReport, SourceRef } from '../../shared/archive'
import { decodeFit } from '../fit/decode'
import { dayForInstant, daysForFit } from '../fit/day'
import { dayFolder, readDay } from '../archive/read'
import { discoverFitFiles } from './discover'

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
async function atomicWrite(path: string, bytes: string | Uint8Array): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`
  await writeFile(temp, bytes)
  try { await rename(temp, path) }
  catch (error) { await import('node:fs/promises').then(fs => fs.rm(temp, { force: true })); throw error }
}

export async function importDevice(garminRoot: string, config: ArchiveConfig): Promise<ImportReport> {
  const report: ImportReport = { imported: 0, unchanged: 0, pending: 0, errors: [] }
  await mkdir(config.stagingRoot, { recursive: true })
  const found = await discoverFitFiles(garminRoot)
  for (const path of found) {
    try {
      const bytes = await readFile(path)
      const hash = sha(bytes)
      const staged = join(config.stagingRoot, `${hash}.fit`)
      try { if (sha(await readFile(staged)) !== hash) throw new Error('Staging hash mismatch') }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        await atomicWrite(staged, bytes)
      }
      const source: SourceRef = { sha256: hash, sourcePath: relative(garminRoot, path).split(sep).join('/'), originalName: basename(path), kind: basename(join(path, '..')) }
      await atomicWrite(join(config.stagingRoot, `${hash}.json`), JSON.stringify(source))
    } catch (error) { report.errors.push(`${path}: ${String(error)}`) }
  }
  let stageNames: string[] = []
  try { stageNames = (await readdir(config.stagingRoot)).filter(name => /^[a-f0-9]{64}\.json$/.test(name)) }
  catch (error) { report.errors.push(String(error)) }
  for (const name of stageNames) {
    try {
      const source = JSON.parse(await readFile(join(config.stagingRoot, name), 'utf8')) as SourceRef
      const bytes = await readFile(join(config.stagingRoot, `${source.sha256}.fit`))
      if (sha(bytes) !== source.sha256) throw new Error('Staging hash mismatch')
      const decoded = decodeFit(bytes, source)
      const days = daysForFit(decoded, config.timeZone)
      if (days.length === 0) {
        const original = found.find(path => basename(path) === source.originalName)
        if (original) days.push(dayForInstant((await stat(original)).mtime.toISOString(), config.timeZone))
        else throw new Error('No date in FIT; source file unavailable')
      }
      if (!await stat(dirname(config.archiveRoot)).then(s => s.isDirectory()).catch(() => false)) { report.pending++; continue }
      await mkdir(config.archiveRoot, { recursive: true })
      let changed = false
      for (const day of days) {
        const dir = dayFolder(config.archiveRoot, day)
        const rawDir = join(dir, 'raw'), dataDir = join(dir, 'data')
        await mkdir(rawDir, { recursive: true }); await mkdir(dataDir, { recursive: true })
        const rawPath = join(rawDir, `${source.sha256}-${source.originalName}`)
        const previous = await readDay(config.archiveRoot, day)
        const manifestPath = join(dir, 'manifest.json')
        let manifest: SourceRef[] = []
        try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); if (!Array.isArray(manifest)) throw new Error('Malformed manifest') }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
        const exists = manifest.some(item => item.sha256 === source.sha256)
        if (exists) {
          if (sha(await readFile(rawPath)) !== source.sha256) throw new Error(`Archived source changed: ${rawPath}`)
          continue
        }
        if (await stat(rawPath).then(() => true).catch(() => false)) {
          if (sha(await readFile(rawPath)) !== source.sha256) throw new Error(`Raw filename collision: ${rawPath}`)
        } else {
          await copyFile(join(config.stagingRoot, `${source.sha256}.fit`), `${rawPath}.tmp`)
          if (sha(await readFile(`${rawPath}.tmp`)) !== source.sha256) throw new Error('Archive copy failed verification')
          await rename(`${rawPath}.tmp`, rawPath)
        }
        const data: DayData = previous ?? { schemaVersion: 1, day, activities: [], health: [], sources: [], coverage: [] }
        data.activities.push(...decoded.activities.filter(activity => dayForInstant(activity.startedAt, config.timeZone) === day || (Date.parse(activity.startedAt) < Date.parse(`${day}T23:59:59Z`) && Date.parse(activity.startedAt) + activity.durationSeconds * 1000 >= Date.parse(`${day}T00:00:00Z`))))
        data.health.push(...decoded.health.filter(item => dayForInstant(item.timestamp, config.timeZone) === day))
        data.coverage.push(...decoded.coverage)
        data.sources.push(source)
        await atomicWrite(join(dataDir, 'day.json'), JSON.stringify(data, null, 2))
        await atomicWrite(manifestPath, JSON.stringify([...manifest, source], null, 2))
        changed = true
      }
      if (changed) report.imported++; else report.unchanged++
    } catch (error) { report.errors.push(`${name}: ${String(error)}`); report.pending++ }
  }
  return report
}
