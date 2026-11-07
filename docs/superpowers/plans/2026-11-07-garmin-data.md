# GarminData Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Windows Electron app that imports Forerunner 55 FIT files into a day-organized, owner-controlled mounted Google Drive archive and displays grounded charts and Markdown summaries.

**Architecture:** A typed Electron main-process pipeline stages and decodes read-only FIT files, writes atomic daily archive files under the configured mounted Drive root, and exposes read-only views via narrow preload IPC. A renderer reads only the Drive archive; deterministic Markdown is augmented by optional AI commentary, and a project OpenCode skill/agent can analyze archived JSON independently.

**Tech Stack:** TypeScript, Electron, electron-vite, React, Vitest, `@garmin/fitsdk`, Recharts, electron-builder; Node built-ins for hashing/fs and an injectable OpenAI-compatible HTTPS adapter for optional AI.

**Spec:** `docs/superpowers/specs/2026-11-07-garmin-data-design.md`

## Global Constraints

- Windows desktop, default archive root `G:\My Drive\GarminData`; configurable if the mount changes.
- Archive layout `GarminData/YYYY/MM/DD/` with `raw/*.fit`, `data/*.json`, `summary.md` and manifest/checksum.
- Watch filesystem is read-only; raw FIT files are the source of truth. Never infer unsupported sleep fields or medical conclusions.
- Mounted Drive write is **not** cloud-sync confirmation; UI must distinguish these states.
- Optional AI only receives bounded normalized metrics, no raw FIT, GPS, device identifiers or secrets by default; import and factual summaries work without AI.
- Actual device is available at present but may be unplugged; tests must not write to it or the live Drive folder.

## Review Focus

- Replugging after a partially completed copy should resume without duplicated or truncated archive entries (Task 3 test).
- Overnight/UTC/DST activity timestamps must not silently land on the wrong date (Task 2 test).
- Garmin-specific sleep records must remain preserved and show `unsupported`, never `0` hours (Task 2 test).
- A Drive mount that disappears mid-import must leave local staged data and an honest pending state (Task 3 test).
- Edited user prose in `summary.md` must survive summary regeneration (Task 5 test).

---

### Task 1: Project shell and shared contracts

**Files:** Create `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `src/shared/archive.ts`, `src/main/config.ts`, `src/main/config.test.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`.

**Interfaces:** Produce `ArchiveConfig { archiveRoot: string; stagingRoot: string; timeZone: string; ai?: { endpoint: string; model: string; keyRef: string } }`; `DayData { schemaVersion: 1; day: string; activities: Activity[]; health: HealthMetric[]; sources: SourceRef[]; coverage: Coverage[] }`; `Activity { id: string; sport: string; startedAt: string; durationSeconds: number; distanceMeters?: number; avgHeartRateBpm?: number; calories?: number; ascentMeters?: number }`; `SourceRef { sha256: string; sourcePath: string; originalName: string; kind: string }`; `Coverage { kind: string; state: 'available'|'unsupported'|'missing'; reason?: string }`; `loadConfig(userData: string): Promise<ArchiveConfig>` (default mounted Drive, stage under userData, explicit IANA timezone setting).

- [ ] **Step 1: Write failing config test** in `src/main/config.test.ts`: temp userData without config yields `G:\My Drive\GarminData`, stage under temp and configured timezone; an existing settings file overrides root without storing an API key in it.
- [ ] **Step 2: Run** `npm test -- src/main/config.test.ts`; expect failure before implementation.
- [ ] **Step 3: Scaffold Electron/React/Vitest and implement contracts and `loadConfig`** in files above; do not create live archive folders at startup.
- [ ] **Step 4: Run** `npm test -- src/main/config.test.ts` and `npm run typecheck`; expect pass.
- [ ] **Step 5: Commit** `git add ... && git commit -m "feat: establish GarminData app and contracts"` (after initializing repo and committing approved spec/plan).

### Task 2: FIT decoding and date attribution

**Files:** Create `src/main/fit/decode.ts`, `src/main/fit/decode.test.ts`, `src/main/fit/day.ts`, `src/main/fit/day.test.ts`, `tests/fixtures/` with synthetic/generated fixture FITs only; extend `src/shared/archive.ts` if fixture reveals needed fields.

**Interfaces:** Produce `decodeFit(bytes: Uint8Array, source: SourceRef): DecodedFit` where `DecodedFit { source: SourceRef; activities: Activity[]; health: HealthMetric[]; coverage: Coverage[]; observations: TimestampedObservation[] }`; `dayForInstant(timestamp: string, timeZone: string): string`; `daysForFit(decoded: DecodedFit, timeZone: string): string[]`. Normalize recognized FIT sessions/records/monitoring; include unknown-message coverage and raw-message provenance. No invented sleep stage/duration.

- [ ] **Step 1: Write failing tests:** session fixture yields cycling sport, distance and bpm with source hash; monitoring yields only recognized fields; opaque sleep fixture yields `unsupported` coverage; 23:30 UTC crossing local midnight groups by configured zone; DST instant maps consistently.
- [ ] **Step 2: Run** `npm test -- src/main/fit`; expect failure.
- [ ] **Step 3: Implement decoder using `@garmin/fitsdk` and timezone grouping**; preserve unknown message metadata in derived JSON, rely on archived FIT for lossless re-decoding; pin test fixtures and document provenance.
- [ ] **Step 4: Run** `npm test -- src/main/fit` and `npm run typecheck`; expect pass.
- [ ] **Step 5: Commit** `git add src/main/fit src/shared/archive.ts tests/fixtures && git commit -m "feat: decode supported Garmin FIT metrics"`.

### Task 3: Durable daily archive importer

**Files:** Create `src/main/import/importer.ts`, `src/main/import/importer.test.ts`, `src/main/import/discover.ts`, `src/main/import/discover.test.ts`, `src/main/archive/read.ts`, `src/main/archive/read.test.ts`.

**Interfaces:** Produce `discoverFitFiles(garminRoot: string): Promise<string[]>` (relevant FIT folders, no write); `importDevice(garminRoot: string, config: ArchiveConfig): Promise<ImportReport>` with `ImportReport { imported: number; unchanged: number; pending: number; errors: string[] }`; `listDays(archiveRoot: string): Promise<string[]>`; `readDay(archiveRoot: string, day: string): Promise<DayData|null>`. Staging survives interruptions. Hash before copying; temp-write + rename + verify raw copy; manifest tracks SHA256 and original path; never overwrite conflicting bytes. Reprocess staged files when Drive reappears; for spanning FIT copy into every contributing day and retain cross-day source linkage.

- [ ] **Step 1: Write failing temp-directory tests:** first import writes daily raw/JSON/manifest; second import unchanged; different file with same filename remains distinct by hash; overnight FIT appears in both day folders; Drive disappears during write and staged copy remains pending; partial temp file is never considered committed; a day with malformed JSON reports error rather than wiping it.
- [ ] **Step 2: Run** `npm test -- src/main/import src/main/archive`; expect failure.
- [ ] **Step 3: Implement importer, discovery, and archive reader**; avoid writing to actual `E:` or `G:` in tests.
- [ ] **Step 4: Run** `npm test -- src/main/import src/main/archive` and `npm run typecheck`; expect pass.
- [ ] **Step 5: Commit** `git add src/main/import src/main/archive && git commit -m "feat: archive Garmin files by day with resumable staging"`.

### Task 4: Windows arrival handling and secure desktop bridge

**Files:** Create `src/main/device/watch.ts`, `src/main/device/watch.test.ts`, `src/main/ipc.ts`, `src/main/ipc.test.ts`; modify `src/main/index.ts`, `src/preload/index.ts`, `src/shared/archive.ts`.

**Interfaces:** Produce `findGarminVolumes(roots: string[]): Promise<string[]>` by device folder signature; `startDeviceWatcher(onFound: (root: string) => Promise<void>): () => void` (startup scan, Windows volume arrival/poll fallback, debounce, reattempt pending); renderer `window.garmin` API: `status()`, `importNow()`, `listDays()`, `readDay(day)`, `settings()` and `saveSettings(partial)` with validated paths and no arbitrary file read/write.

- [ ] **Step 1: Write failing tests:** non-Garmin drive ignored, relocated Garmin detected, duplicate arrival triggers one import, startup with watch attached triggers import, invalid day/path traversal rejected by IPC, missing Drive reports pending rather than synced.
- [ ] **Step 2: Run** `npm test -- src/main/device src/main/ipc.test.ts`; expect failure.
- [ ] **Step 3: Implement watcher, secure preload bridge, tray menu, opt-in launch-at-login and renderer-safe IPC**; app keeps watcher active when window closes to tray and quits via tray menu.
- [ ] **Step 4: Run** `npm test -- src/main/device src/main/ipc.test.ts` and `npm run typecheck`; expect pass.
- [ ] **Step 5: Commit** `git add src/main/device src/main/ipc.ts src/main/index.ts src/preload/index.ts src/shared/archive.ts && git commit -m "feat: detect connected Garmin and expose safe import controls"`.

### Task 5: Markdown summaries and optional AI commentary

**Files:** Create `src/main/summary/facts.ts`, `src/main/summary/facts.test.ts`, `src/main/summary/ai.ts`, `src/main/summary/ai.test.ts`, `src/main/summary/write.ts`, `src/main/summary/write.test.ts`; modify `src/main/import/importer.ts`.

**Interfaces:** Produce `buildFacts(day: DayData, history: DayData[]): string`; `requestInsights(day: DayData, history: DayData[], settings: ArchiveConfig['ai']): Promise<string|null>`; `updateManagedSummary(previous: string|null, facts: string, insights: string|null): string`. Managed section markers preserve unrelated user Markdown. AI request contains only aggregate values and coverage, no GPS, serial, source paths, or raw FIT; key comes from OS credential store or environment reference and is never written to archive.

- [ ] **Step 1: Write failing tests:** sample cycling day renders factual units and source provenance; unavailable sleep explicitly says unsupported; 7-day trend compares comparable available days; AI request redacts coordinates/identifiers, handles timeout and hallucinated/unparseable output as absent; regenerating keeps prose outside managed markers unchanged.
- [ ] **Step 2: Run** `npm test -- src/main/summary`; expect failure.
- [ ] **Step 3: Implement deterministic summary and guarded optional AI adapter**; atomically update `summary.md` after daily JSON is committed, and leave facts intact on AI failure.
- [ ] **Step 4: Run** `npm test -- src/main/summary` and `npm run typecheck`; expect pass.
- [ ] **Step 5: Commit** `git add src/main/summary src/main/import/importer.ts && git commit -m "feat: write evidence-based daily Markdown summaries"`.

### Task 6: Drive-backed dashboard and charts

**Files:** Create `src/renderer/App.tsx`, `src/renderer/App.test.tsx`, `src/renderer/components/ActivityChart.tsx`, `src/renderer/components/HealthChart.tsx`, `src/renderer/metrics.ts`, `src/renderer/metrics.test.ts`, `src/renderer/styles.css`; modify `src/renderer/main.tsx`.

**Interfaces:** Produce `activitySeries(days: DayData[]): ChartPoint[]` and `healthSeries(days: DayData[], metric: string): ChartPoint[]` preserving null data gaps; renderer consumes only preload archive methods; presents calendar/day detail, activities, available sleep/monitoring, trends, manual import/settings and distinct saved-to-mount vs cloud-not-verified status.

- [ ] **Step 1: Write failing tests:** date-sorted distance chart in km, unsupported sleep represented as gap rather than zero, archive unavailable shows no fake locally staged data, day detail includes links to source/raw metadata and Markdown summary, backup status does not say synced.
- [ ] **Step 2: Run** `npm test -- src/renderer`; expect failure.
- [ ] **Step 3: Implement responsive dashboard and accessible Recharts views**; reading data always goes through `readDay` on mounted Drive, not staging.
- [ ] **Step 4: Run** `npm test -- src/renderer` and `npm run typecheck`; expect pass.
- [ ] **Step 5: Commit** `git add src/renderer && git commit -m "feat: explore Garmin archive and health trends"`.

### Task 7: OpenCode skill/agent, packaging and real-device read-only verification

**Files:** Create `.opencode/skills/garmin-insights/SKILL.md`, `.opencode/agents/garmin-analyst.md` (confirm exact V2 syntax from docs), `README.md`, `electron-builder.yml`, `scripts/verify-readonly.mjs`, `scripts/verify-readonly.test.ts`; modify `package.json`.

**Interfaces:** Skill/agent read the documented JSON schema, cite dates and metric sources, emit Markdown with graph specifications/trends, distinguish absent vs unsupported, prohibit diagnoses and raw-file edits. Script `verifyReadonly(deviceRoot: string, archiveRoot: string): Promise<VerificationReport>` snapshots watch hashes/metadata before/after manual import, checks Drive files and generated JSON/Markdown, and reports limitations without changing watch.

- [ ] **Step 1: Write failing tests:** verifier detects missing day artifact, untouched source hash, absent Drive handling; validate skill/agent files contain schema path, evidence and privacy rules with a doc-format smoke test.
- [ ] **Step 2: Run** `npm test -- scripts/verify-readonly.test.ts`; expect failure.
- [ ] **Step 3: Read OpenCode V2 skills/agents documentation, write valid project definitions, package Windows app and document installation, background mode, AI opt-in, mount/sync caveat, sleep limits, archive recovery and how to run agent.**
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run build`, `npm run dist:win`; expect all pass. With the owner's currently attached watch, run a read-only verification/import to the requested `G:\My Drive\GarminData`, inspect one day, and verify watch file hashes unchanged; if device/Drive unavailable, report the unverified manual step explicitly.
- [ ] **Step 5: Commit** `git add .opencode README.md electron-builder.yml scripts package.json && git commit -m "feat: package GarminData and add analyst agent"`.
