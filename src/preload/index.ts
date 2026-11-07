import { contextBridge, ipcRenderer } from 'electron'
import type { ArchiveConfig, DayData, ImportReport } from '../shared/archive'

export interface GarminBridge {
  status(): Promise<{ archiveRoot: string; watchRoot: string | null; lastImport: ImportReport | null; cloudSyncConfirmed: false }>
  importNow(): Promise<ImportReport>
  listDays(): Promise<string[]>
  readDay(day: string): Promise<DayData | null>
  readSummary(day: string): Promise<string | null>
  settings(): Promise<ArchiveConfig>
  saveSettings(partial: Partial<ArchiveConfig>): Promise<ArchiveConfig>
}
const api: GarminBridge = {
  status: () => ipcRenderer.invoke('garmin:status'), importNow: () => ipcRenderer.invoke('garmin:importNow'),
  listDays: () => ipcRenderer.invoke('garmin:listDays'), readDay: day => ipcRenderer.invoke('garmin:readDay', day),
  readSummary: day => ipcRenderer.invoke('garmin:readSummary', day),
  settings: () => ipcRenderer.invoke('garmin:settings'), saveSettings: partial => ipcRenderer.invoke('garmin:saveSettings', partial),
}
contextBridge.exposeInMainWorld('garmin', api)
