import { join } from 'node:path'
import { verifyReadonly } from './verify-readonly'

const device = process.argv[2] ?? 'E:\\'
const archive = process.argv[3] ?? 'G:\\My Drive\\GarminData'
const timeZone = process.argv[4] ?? Intl.DateTimeFormat().resolvedOptions().timeZone
const staging = join(process.env.LOCALAPPDATA ?? process.cwd(), 'GarminData', 'staging')
const report = await verifyReadonly(device, archive, staging, timeZone)
console.log(JSON.stringify(report, null, 2))
if (!report.watchUnchanged || report.pending || report.errors.length || report.missingArtifacts.length) process.exitCode = 1
