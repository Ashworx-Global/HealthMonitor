import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { DayData } from '../../shared/archive'

export function dayFolder(root: string, day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw new Error('Invalid day')
  const [year, month, date] = day.split('-')
  return join(root, year, month, date)
}
export async function readDay(root: string, day: string): Promise<DayData | null> {
  try {
    const content = JSON.parse(await readFile(join(dayFolder(root, day), 'data', 'day.json'), 'utf8')) as DayData
    if (content.schemaVersion !== 1 || content.day !== day || !Array.isArray(content.activities) || !Array.isArray(content.health)) throw new Error(`Malformed day data: ${day}`)
    return content
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
export async function readSummary(root: string, day: string): Promise<string | null> {
  try { return await readFile(join(dayFolder(root, day), 'summary.md'), 'utf8') }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
export async function listDays(root: string): Promise<string[]> {
  const result: string[] = []
  try {
    for (const year of await readdir(root, { withFileTypes: true })) {
      if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue
      for (const month of await readdir(join(root, year.name), { withFileTypes: true })) {
        if (!month.isDirectory() || !/^\d{2}$/.test(month.name)) continue
        for (const date of await readdir(join(root, year.name, month.name), { withFileTypes: true })) {
          if (!date.isDirectory() || !/^\d{2}$/.test(date.name)) continue
          const day = `${year.name}-${month.name}-${date.name}`
          if (await readDay(root, day)) result.push(day)
        }
      }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  return result.sort().reverse()
}
