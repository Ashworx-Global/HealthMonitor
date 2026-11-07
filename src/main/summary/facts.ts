import type { DayData } from '../../shared/archive'

export function buildFacts(day: DayData, history: DayData[]): string {
  const lines = [`# ${day.day}`, '', '## Recorded activity']
  if (!day.activities.length) lines.push('No activity recorded in the backed-up files for this day.')
  for (const activity of day.activities) {
    const detail = [`${activity.sport}`, `${(activity.durationSeconds / 60).toFixed(1)} min`]
    if (activity.distanceMeters !== undefined) detail.push(`${(activity.distanceMeters / 1000).toFixed(2)} km`)
    if (activity.avgHeartRateBpm !== undefined) detail.push(`${activity.avgHeartRateBpm} bpm avg HR`)
    if (activity.calories !== undefined) detail.push(`${activity.calories} kcal`)
    if (activity.ascentMeters !== undefined) detail.push(`${activity.ascentMeters} m ascent`)
    lines.push(`- ${detail.join(' · ')}`)
  }
  lines.push('', '## Health and coverage')
  for (const metric of day.health) lines.push(`- ${metric.kind}: ${metric.value} ${metric.unit} (${metric.timestamp})`)
  for (const item of day.coverage) if (item.state !== 'available') lines.push(`- ${item.kind}: ${item.state}${item.reason ? ` — ${item.reason}` : ''}`)
  if (!day.health.length && !day.coverage.length) lines.push('- No verified health metrics in backed-up files.')
  const previous = history.filter(item => item.day < day.day).slice(-7)
  const distances = previous.flatMap(item => item.activities.filter(a => a.distanceMeters !== undefined && a.sport === 'cycling').map(a => a.distanceMeters!))
  if (distances.length >= 3) lines.push('', `## Recent cycling comparison`, `- Previous ${distances.length} comparable rides averaged ${(distances.reduce((a, b) => a + b, 0) / distances.length / 1000).toFixed(2)} km. This is descriptive, not a training recommendation.`)
  lines.push('', '## Sources')
  for (const source of day.sources) lines.push(`- ${source.originalName} (${source.kind}; SHA-256: ${source.sha256})`)
  return lines.join('\n') + '\n'
}
