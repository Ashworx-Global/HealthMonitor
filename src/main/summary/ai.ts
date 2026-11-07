import type { ArchiveConfig, DayData } from '../../shared/archive'

function safeDay(day: DayData) {
  return {
    day: day.day,
    activities: day.activities.map(a => ({ sport: a.sport, durationSeconds: a.durationSeconds, distanceMeters: a.distanceMeters, avgHeartRateBpm: a.avgHeartRateBpm, calories: a.calories, ascentMeters: a.ascentMeters })),
    health: day.health.map(h => ({ kind: h.kind, value: h.value, unit: h.unit })),
    coverage: day.coverage.map(c => ({ kind: c.kind, state: c.state })),
  }
}
export async function requestInsights(day: DayData, history: DayData[], settings: ArchiveConfig['ai'], http: typeof fetch = fetch, env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  if (!settings || !env[settings.keyRef]) return null
  const permittedDates = new Set([day.day, ...history.slice(-7).map(h => h.day)])
  try {
    const response = await http(settings.endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env[settings.keyRef]}` },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ model: settings.model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: 'Write cautious, evidence-based non-medical commentary about comparable trends. No numeric claims, dates not in input, diagnoses, or unsupported sleep assertions. Reply JSON {"commentary":"...","dates":["YYYY-MM-DD"]}.' },
        { role: 'user', content: JSON.stringify({ day: safeDay(day), history: history.slice(-7).map(safeDay) }) },
      ] }),
    })
    if (!response.ok) return null
    const body = await response.json() as { choices?: { message?: { content?: string } }[] }
    const result = JSON.parse(body.choices?.[0]?.message?.content ?? '') as { commentary?: unknown; dates?: unknown }
    if (typeof result.commentary !== 'string' || result.commentary.length > 1200 || /\d/.test(result.commentary) || !Array.isArray(result.dates) || !result.dates.length || !result.dates.every(d => typeof d === 'string' && permittedDates.has(d))) return null
    return `${result.commentary}\n\nEvidence dates: ${result.dates.join(', ')}.`
  } catch { return null }
}
