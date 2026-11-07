const start = '<!-- garmin-data:start -->'
const end = '<!-- garmin-data:end -->'

export function updateManagedSummary(previous: string | null, facts: string, insights: string | null): string {
  const block = `${start}\n${facts.trimEnd()}${insights ? `\n\n## AI commentary (not medical advice)\n${insights.trim()}` : ''}\n${end}`
  if (!previous) return `${block}\n`
  const from = previous.indexOf(start), to = previous.indexOf(end)
  if (from < 0 || to < from) return `${previous.trimEnd()}\n\n${block}\n`
  return previous.slice(0, from) + block + previous.slice(to + end.length)
}
