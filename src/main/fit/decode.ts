import { Decoder, Stream } from '@garmin/fitsdk'
import type { Activity, Coverage, HealthMetric, SourceRef, TimestampedObservation } from '../../shared/archive'

export interface DecodedFit {
  source: SourceRef; activities: Activity[]; health: HealthMetric[]
  coverage: Coverage[]; observations: TimestampedObservation[]
  unknownMessages?: string[]
}

type Mesg = Record<string, unknown>
function iso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString()
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return null
}
function number(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined }

export function decodeFit(bytes: Uint8Array, source: SourceRef): DecodedFit {
  const decoder = new Decoder(Stream.fromBuffer(Buffer.from(bytes)))
  if (!decoder.isFIT() || !decoder.checkIntegrity()) throw new Error(`Invalid FIT file: ${source.originalName}`)
  const { messages, errors } = decoder.read() as unknown as { messages: Record<string, Mesg[]>; errors: unknown[] }
  if (errors.length) throw new Error(`FIT decoding failed: ${String(errors[0])}`)
  const activities: Activity[] = []
  const health: HealthMetric[] = []
  const observations: TimestampedObservation[] = []
  const coverage: Coverage[] = []
  for (const [index, session] of (messages.sessionMesgs ?? []).entries()) {
    const startedAt = iso(session.startTime)
    if (!startedAt) continue
    const activity: Activity = {
      id: `${source.sha256}:${index}`, sourceHash: source.sha256,
      sport: String(session.sport ?? 'unknown'), startedAt,
      durationSeconds: number(session.totalTimerTime) ?? number(session.totalElapsedTime) ?? 0,
      distanceMeters: number(session.totalDistance), avgHeartRateBpm: number(session.avgHeartRate),
      maxHeartRateBpm: number(session.maxHeartRate), calories: number(session.totalCalories),
      ascentMeters: number(session.totalAscent), averageSpeedMetersPerSecond: number(session.enhancedAvgSpeed ?? session.avgSpeed),
    }
    activities.push(activity)
  }
  if (activities.length) coverage.push({ kind: 'activity', state: 'available' })
  for (const msg of messages.monitoringMesgs ?? []) {
    const timestamp = iso(msg.timestamp)
    if (!timestamp) continue
    for (const [field, kind, unit] of [['activeCalories', 'active_calories', 'kcal'], ['distance', 'monitor_distance', 'm'], ['activeTime', 'active_time', 'seconds']] as const) {
      const value = number(msg[field]); if (value !== undefined) health.push({ kind, timestamp, value, unit, sourceHash: source.sha256 })
    }
  }
  for (const msg of messages.stressLevelMesgs ?? []) {
    const timestamp = iso(msg.stressLevelTime ?? msg.timestamp)
    const value = number(msg.stressLevelValue)
    if (timestamp && value !== undefined && value >= 0 && value <= 100) health.push({ kind: 'stress', timestamp, value, unit: 'score', sourceHash: source.sha256 })
  }
  for (const msg of messages.monitoringHrDataMesgs ?? []) {
    const timestamp = iso(msg.timestamp)
    if (!timestamp) continue
    for (const [field, kind] of [['restingHeartRate', 'resting_heart_rate'], ['currentDayRestingHeartRate', 'current_day_resting_heart_rate']] as const) {
      const value = number(msg[field])
      if (value !== undefined && value >= 20 && value <= 250) health.push({ kind, timestamp, value, unit: 'bpm', sourceHash: source.sha256 })
    }
  }
  for (const msg of messages.respirationRateMesgs ?? []) {
    const timestamp = iso(msg.timestamp)
    const value = number(msg.respirationRate)
    if (timestamp && value !== undefined && value > 0 && value <= 100) health.push({ kind: 'respiration_rate', timestamp, value, unit: 'breaths/min', sourceHash: source.sha256 })
  }
  for (const msg of messages.sleepLevelMesgs ?? []) {
    const timestamp = iso(msg.timestamp)
    if (timestamp && typeof msg.sleepLevel === 'string') observations.push({ timestamp, kind: `sleep_level:${msg.sleepLevel}`, value: 1, unit: 'event' })
  }
  if (source.kind.toLowerCase() === 'sleep') coverage.push(observations.length
    ? { kind: 'sleep_levels', state: 'available', reason: 'Sparse level events; total sleep duration not verified' }
    : { kind: 'sleep', state: 'unsupported', reason: 'No verified sleep duration or stages decoded' })
  if (source.kind.toLowerCase() === 'sleep') coverage.push({ kind: 'sleep_duration', state: 'unsupported', reason: 'No verified duration in source' })
  if (health.length) coverage.push({ kind: 'monitoring', state: 'available' })
  const known = new Set(['fileIdMesgs', 'fileCreatorMesgs', 'sessionMesgs', 'activityMesgs', 'recordMesgs', 'lapMesgs', 'monitoringMesgs', 'monitoringInfoMesgs', 'monitoringHrDataMesgs', 'stressLevelMesgs', 'respirationRateMesgs', 'sleepLevelMesgs'])
  const unknownMessages = Object.keys(messages).filter(name => !known.has(name))
  return { source, activities, health, observations, coverage, unknownMessages }
}
