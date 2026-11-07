import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'
import { startDeviceWatcher } from './device/watch'
import { importDevice } from './import/importer'
import { loadConfig } from './config'
import { registerIpc } from './ipc'
import type { ImportReport } from '../shared/archive'

let window: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let lastReport: ImportReport | null = null
function createWindow(): void {
  window = new BrowserWindow({ width: 1200, height: 800, webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: false } })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
  window.on('close', event => { if (!quitting && tray) { event.preventDefault(); window?.hide() } })
}
void app.whenReady().then(async () => {
  await registerIpc(app.getPath('userData'), () => lastReport)
  createWindow()
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+4/kv1QAAAABJRU5ErkJggg==')
  tray = new Tray(icon)
  tray.setToolTip('GarminData — watch archive')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open GarminData', click: () => { window?.show(); window?.focus() } },
    { label: 'Launch at login', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: item => app.setLoginItemSettings({ openAtLogin: item.checked }) },
    { label: 'Quit', click: () => { quitting = true; app.quit() } },
  ]))
  const stop = startDeviceWatcher(async root => {
    lastReport = await importDevice(root, await loadConfig(app.getPath('userData')))
    if (lastReport.pending) throw new Error('Import awaiting Drive')
  })
  app.on('before-quit', () => { quitting = true; stop() })
})
