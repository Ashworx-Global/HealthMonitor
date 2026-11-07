import type { DayData } from '../shared/archive'
export interface ChartPoint { day: string; value: number | null }
export function activitySeries(days: DayData[]): ChartPoint[] {
  return [...days].sort((a, b) => a.day.localeCompare(b.day)).map(day => ({
    day: day.day,
    value: Math.round(day.activities.reduce((sum, a) => sum + (a.distanceMeters ?? 0), 0) / 10) / 100,
  }))
}
export function healthSeries(days: DayData[], metric: string): ChartPoint[] {
  return [...days].sort((a, b) => a.day.localeCompare(b.day)).map(day => {
    const values = day.health.filter(item => item.kind === metric).map(item => item.value)
    return { day: day.day, value: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null }
  })
}
