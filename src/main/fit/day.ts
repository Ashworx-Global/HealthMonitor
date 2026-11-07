import type { DecodedFit } from './decode'

export function dayForInstant(timestamp: string, timeZone: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid timestamp: ${timestamp}`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (key: string): string => parts.find(p => p.type === key)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function daysForFit(decoded: DecodedFit, timeZone: string): string[] {
  const days = new Set<string>()
  for (const activity of decoded.activities) {
    let at = Date.parse(activity.startedAt)
    const end = at + Math.max(0, activity.durationSeconds) * 1000
    for (; at <= end; at += 3600_000) days.add(dayForInstant(new Date(at).toISOString(), timeZone))
    days.add(dayForInstant(new Date(end).toISOString(), timeZone))
  }
  for (const item of [...decoded.health, ...decoded.observations]) days.add(dayForInstant(item.timestamp, timeZone))
  return [...days].sort()
}
