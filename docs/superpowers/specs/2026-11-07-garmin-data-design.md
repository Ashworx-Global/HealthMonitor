# GarminData: personal Garmin archive and desktop explorer

## Intent
Build a Windows desktop app for the owner's Forerunner 55 that imports data when the watch is plugged in, stores an inspectable, owner-controlled archive in `G:\My Drive\GarminData`, and explores activities and health trends. Each day has original FIT files, extracted JSON, and Markdown summaries. Optional AI commentary is allowed, but grounded in extracted values.

## Goals
- Detect a mounted Garmin device when the app is running (including startup with the device already mounted); provide manual import and a tray/background-at-login option so plugging in can trigger imports without the main window open.
- Import Activity, Sleep, Monitor, and other relevant FIT files read-only, preserving original bytes, source path, hash, timestamps, and parsing provenance.
- Group by device-local calendar day under `GarminData/YYYY/MM/DD/`, with `raw/*.fit`, `data/*.json`, and `summary.md`. Copy a spanning source FIT into every day to which it contributes, or preserve an explicit cross-day reference when duplication is impractical. Maintain a manifest/checksum to make repeat imports idempotent and detect collisions.
- Extract verified metrics (activities, laps/records, heart rate, distance, pace/speed, elevation, calories, monitoring/steps/stress and sleep where decodable); retain raw unknown FIT fields in JSON with clear labels rather than guessing their meaning. Include source, units, time zone, and missing/unsupported status in normalized JSON.
- Display activity, sleep and health views and trends from `G:\My Drive\GarminData` only, including data gaps and import/backup status. Graph only metrics supported by the files actually present.
- Generate factual Markdown day summaries beside the FIT/JSON. Include short longer-term trend commentary when enough comparable days exist. An AI service may receive the minimum relevant extracted metrics for an educated narrative, never raw FIT/GPS/identifiers by default; label AI commentary and show its input window. A deterministic factual summary still works with no API key/network.
- Supply a project OpenCode skill and agent for inspecting these saved JSON files and producing grounded Markdown insights and graphs/graph specifications without making medical diagnoses.
- Preserve local staging copies until writing to the mounted Drive folder is confirmed; handle drive absent, device removal, interrupted copies, and duplicate imports. Show "saved to mounted Drive" separately from "cloud sync confirmed"; the app cannot guarantee Google Drive has uploaded using the filesystem alone.

## Non-goals and anti-goals
- No Garmin account scraping, no mandatory Garmin Connect, no direct Drive API/OAuth in this version, and no claim to have a verified offsite backup.
- No deletion or modification of watch files. No invented sleep stages or unsupported health metrics, diagnoses, or unqualified training advice.
- Do not require the AI service for import, archive access, graphs, or factual summaries. No secrets in archive/Markdown; settings and API keys stay outside the archive.

## Constraints and findings
- Windows host; Forerunner 55 mounted as `E:\GARMIN`, but drive letters can change. Google Drive for desktop currently mounted at `G:\My Drive`, but that may also change; configure archive path and validate drive availability.
- `Activity` has ordinary FIT sessions. `Sleep` and parts of `Monitor` use Garmin-specific message numbers not decoded by the tested generic FIT parser. Preserve all original files and expose parsed known fields; full sleep extraction needs profile validation or a later compatible export/source. Never treat a missing decoder as zero sleep.
- FIT timestamps may be UTC while filenames/device local timestamps reflect local time; day attribution must use an explicit device-local timezone setting and be consistent across midnight/DST.
- Raw activity FIT may contain precise GPS and personal health information. Restrict AI payloads by default; keep local access and archive warnings explicit.

## Approaches
1. **Chosen: mounted Google Drive folder plus local staging.** Simple, inspectable files with no Drive OAuth; owner selected the existing `G:\My Drive` mount. Successful write proves only local mount persistence; sync verification is out of scope.
2. **Direct Google Drive API.** Can confirm remote upload and operate independently of Drive for desktop, but requires OAuth, token management and more complexity; defer until the owner wants verified cloud backup.

For analysis, a local-only rule engine would maximize privacy but limit prose; owner explicitly permits an AI service. Use factual local calculations first and optional AI narrative second, with the same files as the source of truth.

## Architecture and user flow
1. Electron main process identifies a Garmin volume by Garmin device structure and watches volume arrivals/periodically checks while running; tray/background option launches at login. Renderer never reads arbitrary filesystem paths directly. Expose narrow preload IPC methods.
2. Import service copies FIT files to a durable local staging directory, verifies size/hash, parses there, and atomically writes original FIT/normalized JSON/summary/manifest under the configured mounted Drive path. Re-import is resumable and idempotent. Warn if Drive is unavailable; queue and retry, never silently report success.
3. Parsing module decodes known FIT message types, records unknown types/fields and unsupported coverage, groups timestamped data by the configured local day, and maintains links from derived values to source file hashes. Keep raw message data or enough lossless provenance in JSON to revisit decoding later; raw FIT remains authoritative.
4. Renderer reads the saved archive from Drive, offers dashboard, calendar/day detail, activity detail, sleep/health coverage, charts across comparable days, and visible backup/sync caveats. It does not silently switch to staging as the dashboard's authoritative data source.
5. Markdown generator creates factual tables and explicit missing-data notes; optional configurable AI provider adds a separately marked insights section from bounded JSON summaries. On AI errors, retain factual Markdown and show an error; never overwrite a user's edited Markdown without a safe regeneration strategy (managed sections or versioned files).
6. OpenCode project skill/agent document the archive schema, data minimization, evidence/citation rules, graph workflow and safe interpretation; they do not run automatically or become a prerequisite for using the app.

## Validation and release boundary
- Tests with small synthetic FIT fixtures plus copies of actual watch files in a temporary test area (never alter watch). Cover date grouping, idempotency, unknown messages, partial writes, device disappearance, missing Drive, AI failures, and graph calculations.
- First usable version: import current watch files to `GarminData`, show activities and available health metrics and trends, produce per-day JSON/Markdown, and package a Windows Electron app plus project-local skill/agent. Sleep details appear only if a verified decoder/source is found; otherwise display backed-up raw sleep data with explicit unsupported status.

## Builder discretion
- Exact TypeScript packages, chart library, FIT parser/SDK, Windows drive-notification mechanism, chosen AI API adapter, visual styling, precise JSON schema/version and test framework, provided choices honor the above behavior and are documented.
