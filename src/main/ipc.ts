import { isAbsolute } from 'node:path'
import { stat } from 'node:fs/promises'
import type { ArchiveConfig, ImportReport } from '../shared/archive'
import { dayFolder, listDays, readDay, readSummary } from './archive/read'
import { loadConfig, saveConfig } from './config'
import { findGarminVolumes } from './device/watch'
import { importDevice } from './import/importer'

export function validateDay(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Invalid day')
  dayFolder('.', input)
  return input
}
export function validateSettings(partial: unknown): Partial<ArchiveConfig> {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) throw new Error('Invalid settings')
  const value = partial as Record<string, unknown>
  if (Object.keys(value).some(k => !['archiveRoot', 'timeZone', 'ai'].includes(k))) throw new Error('Unknown setting')
  if ('archiveRoot' in value && (typeof value.archiveRoot !== 'string' || !isAbsolute(value.archiveRoot) || !value.archiveRoot.trim())) throw new Error('Archive path must be absolute')
  if ('timeZone' in value) {
    if (typeof value.timeZone !== 'string') throw new Error('Invalid timezone')
    new Intl.DateTimeFormat('en-US', { timeZone: value.timeZone })
  }
  if ('ai' in value && value.ai !== undefined) {
    const ai = value.ai as Record<string, unknown>
    if (!ai || Object.keys(ai).some(k => !['endpoint', 'model', 'keyRef'].includes(k))) throw new Error('Invalid AI settings')
    if (typeof ai.endpoint !== 'string' || !/^https:\/\//i.test(ai.endpoint) || typeof ai.model !== 'string' || !ai.model.trim() || typeof ai.keyRef !== 'string' || !/^[A-Z_][A-Z_0-9]*$/.test(ai.keyRef)) throw new Error('Invalid AI settings')
  }
  return value as Partial<ArchiveConfig>
}

export function createBridgeHandlers(userData: string, getWatchRoot: () => Promise<string | null>, getLastReport: () => ImportReport | null) {
  return {
    async status() { const config = await loadConfig(userData); return { archiveRoot: config.archiveRoot, archiveAvailable: await stat(config.archiveRoot).then(s => s.isDirectory()).catch(() => false), watchRoot: await getWatchRoot(), lastImport: getLastReport(), cloudSyncConfirmed: false } },
    async importNow() { const root = await getWatchRoot(); if (!root) throw new Error('Garmin watch not connected'); return importDevice(root, await loadConfig(userData)) },
    async listDays() { return listDays((await loadConfig(userData)).archiveRoot) },
    async readDay(day: unknown) { return readDay((await loadConfig(userData)).archiveRoot, validateDay(day)) },
    async readSummary(day: unknown) { return readSummary((await loadConfig(userData)).archiveRoot, validateDay(day)) },
    async settings() { return loadConfig(userData) },
    async saveSettings(partial: unknown) { const current = await loadConfig(userData); await saveConfig(userData, { ...current, ...validateSettings(partial) }); return loadConfig(userData) },
  }
}

export async function registerIpc(userData: string, getReport: () => ImportReport | null): Promise<void> {
  const { ipcMain } = await import('electron')
  const getRoot = async (): Promise<string | null> => (await findGarminVolumes(Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}:\\`)))[0] ?? null
  const handlers = createBridgeHandlers(userData, getRoot, getReport)
  for (const [name, handler] of Object.entries(handlers)) ipcMain.handle(`garmin:${name}`, (_event, ...args: unknown[]) => (handler as (...args: unknown[]) => unknown)(...args))
}
