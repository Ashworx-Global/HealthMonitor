import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const folders = ['Activity', 'Sleep', 'Monitor', 'Metrics', 'SUMMARY', 'Totals', 'Records', 'HSA']
export async function discoverFitFiles(garminRoot: string): Promise<string[]> {
  const files: string[] = []
  for (const folder of folders) {
    try {
      for (const entry of await readdir(join(garminRoot, 'GARMIN', folder), { withFileTypes: true }))
        if (entry.isFile() && /\.fit$/i.test(entry.name)) files.push(join(garminRoot, 'GARMIN', folder, entry.name))
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  return files.sort()
}
