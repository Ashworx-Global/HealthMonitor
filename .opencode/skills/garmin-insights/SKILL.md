---
name: garmin-insights
description: Use when interpreting archived GarminData FIT-derived JSON, writing day or trend summaries, or proposing graphs for the owner's Garmin health and activity data.
---

# GarminData insights

## Core principle
The owner's mounted-Drive archive is authoritative. Every claimed number must come from a dated `data/day.json` file; raw FIT is retained as evidence, not something to edit. Never substitute confidence for missing measurements.

## Locate and read
1. Default archive root: `G:\My Drive\GarminData` (ask for the configured path if absent). Days are `YYYY/MM/DD/data/day.json`, next to `raw/<sha256>-<original>.fit`, `manifest.json`, and `summary.md`. This is a mounted Drive folder; a file existing there does **not** verify offsite cloud sync.
2. Read only requested days or at most seven comparable prior days. Use `schemaVersion: 1`, `day`, `activities`, `health`, `coverage`, and `sources`. Activity `distanceMeters` is meters, `durationSeconds` is seconds, `avgHeartRateBpm` is bpm. Health metrics have `kind`, `timestamp`, `value`, `unit`, `sourceHash`. Sources have `originalName` and `sha256`. Dates are device-local archive days; individual activity timestamps are UTC.
3. If `coverage` says `unsupported` or `missing`, say that explicitly; do not chart as zero. Garmin sleep-level **events** are not a verified night's total sleep. A single ride is not a trend. Multiple sources may duplicate the same session: deduplicate identical timestamps and sports before totaling.

## Output contract
- Provide factual Markdown: day/date, supported activity and health values with units, comparison only among available comparable days, missing/unsupported notes, and evidence citations by day + source FIT filename/hash prefix.
- Graphs: provide either a small Markdown table and chart specification (`x`: day, `y`: metric and unit, gaps: null), or generate a graph if a chart tool is available. Never invent points or connect gaps. Prefer distance by day and metrics with verified samples.
- Separate interpretation from facts. Use tentative, nonmedical language. Do not diagnose, prescribe, or assert causes of changes. User-reported feeling rested is distinct from device-measured sleep.
- Do not send GPS coordinates, raw FIT, serial numbers, file paths, or secrets to an AI service. Do not modify watch files. Write a generated summary only inside the marked `<!-- garmin-data:start -->` / `<!-- garmin-data:end -->` region of a daily `summary.md`; preserve the owner's prose outside it. Ask before editing the archive manually.

## Example
Given one `2026-11-07` cycling activity with `distanceMeters: 13317.11`, `durationSeconds: 3769`, `avgHeartRateBpm: 152`, a source `ride.fit`, and `sleep_duration: unsupported`: report **13.32 km**, **1:02:49**, **152 bpm avg**, cite `2026-11-07 · ride.fit`, say sleep duration unavailable, and offer only a single-point graph (not a trend).

## Common mistakes
| Mistake | Correction |
| --- | --- |
| Missing sleep becomes 0 h | Mark null/unsupported; preserve raw backup. |
| Sum activity and SUMMARY duplicate sessions | Deduplicate by sport and start instant. |
| Count mounted write as Google-upload confirmation | Say saved to mounted folder, sync unverified. |
| Compare different sports or days without observations | Restrict comparison and name data gaps. |
