# GarminData

Windows desktop archive for a connected Forerunner 55. The app reads the watch, stages original FIT files under `%LOCALAPPDATA%\GarminData\staging`, and writes day-organized copies to your mounted `G:\My Drive\GarminData`. The app's dashboard reads **only** that Drive folder.

## Run

```powershell
npm install
npm run dev
```

Keep the app running in the tray to import on plug-in, or choose **Launch at login** from the tray menu. Use **Import watch** for a manual scan. Change archive root, local timezone and optional AI service via **Settings**. The device letter is discovered by its GARMIN directory, not hardcoded. To package: `npm run build` then `npm run dist:win`; the portable Windows executable is under `dist/`.

For an explicit read-only watch verification and import, run `npm run import:verify -- "E:\" "G:\My Drive\GarminData" "Africa/Johannesburg"` with your actual watch drive and IANA timezone. It hashes watch FIT files before and after import. Do not run this command against an untrusted device or a wrong destination.

## Archive structure

Each `GarminData/YYYY/MM/DD/` includes `raw/<sha256>-<original>.fit`, `data/day.json`, `manifest.json`, and `summary.md`. JSON schema version 1 contains `activities`, `health`, `coverage`, and `sources`. Source FIT files may be copied into more than one day for an overnight activity. Original FIT data is authoritative; unknown FIT message names and unsupported coverage are recorded without invented values. The summary has a managed region; text outside its markers survives regeneration. The parser can identify some sparse Garmin sleep-level events, but cannot verify total sleep duration from them. Missing metrics are not zeros.

**Drive limitation:** a successful write to `G:\My Drive` does not prove Google's client uploaded it. Check Google Drive for desktop's sync status yourself. If the mount is absent, the app retains staged files locally and marks them pending. It never deletes source watch files or archived originals. Avoid storing the project repository or staging directory inside the cloud folder; only `GarminData` is the archive.

## AI and analysis

AI is optional. Configure an HTTPS OpenAI-compatible chat-completions endpoint, model, and the **name** of a Windows environment variable holding its key (not the key itself). For example, set `GARMIN_AI_KEY` for the process and enter that name in Settings. Only selected aggregate metrics and availability flags are sent; no FIT, GPS, device serial, source paths or API key appears in the archive. Factual Markdown still works without AI. AI prose is explicitly marked, constrained to cited dates without numeric claims; it is not medical advice.

Open this repository in OpenCode and ask for the `garmin-insights` skill, or ask the `garmin-analyst` subagent to summarize chosen days or draft gap-aware graph specifications. Its output is read-only; the app manages on-disk summaries.

## Tests

`npm test` · `npm run typecheck` · `npm run build`. Synthetic FIT fixtures are generated in tests; tests do not write to the actual watch or Drive.
