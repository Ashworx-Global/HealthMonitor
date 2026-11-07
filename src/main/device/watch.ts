import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export async function findGarminVolumes(roots: string[]): Promise<string[]> {
  const found: string[] = []
  for (const root of roots) {
    const activity = await stat(join(root, 'GARMIN', 'Activity')).then(s => s.isDirectory()).catch(() => false)
    const settings = await stat(join(root, 'GARMIN', 'Settings')).then(s => s.isDirectory()).catch(() => false)
    if (activity || settings) found.push(root)
  }
  return found
}

const windowsRoots = async (): Promise<string[]> => Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}:\\`)
export function startDeviceWatcher(
  onFound: (root: string) => Promise<void>,
  options: { roots?: () => Promise<string[]>; identify?: typeof findGarminVolumes; intervalMs?: number } = {},
): () => void {
  const roots = options.roots ?? windowsRoots
  const identify = options.identify ?? findGarminVolumes
  const seen = new Set<string>()
  let stopped = false, busy = false
  async function scan(): Promise<void> {
    if (stopped || busy) return
    busy = true
    try {
      const found = await identify(await roots())
      for (const old of seen) if (!found.includes(old)) seen.delete(old)
      for (const root of found) if (!seen.has(root)) {
        seen.add(root)
        try { await onFound(root) } catch { seen.delete(root) }
      }
    } finally { busy = false }
  }
  void scan()
  const interval = setInterval(() => { void scan() }, options.intervalMs ?? 12000)
  return () => { stopped = true; clearInterval(interval) }
}
