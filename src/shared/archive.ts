export interface ArchiveConfig {
  archiveRoot: string
  stagingRoot: string
  timeZone: string
  ai?: { endpoint: string; model: string; keyRef: string }
}
export interface SourceRef { sha256: string; sourcePath: string; originalName: string; kind: string }
export interface Coverage { kind: string; state: 'available' | 'unsupported' | 'missing'; reason?: string }
export interface Activity {
  id: string; sport: string; startedAt: string; durationSeconds: number
  distanceMeters?: number; avgHeartRateBpm?: number; maxHeartRateBpm?: number
  calories?: number; ascentMeters?: number; averageSpeedMetersPerSecond?: number
  sourceHash?: string
}
export interface HealthMetric { kind: string; timestamp: string; value: number; unit: string; sourceHash: string }
export interface TimestampedObservation { timestamp: string; kind: string; value: number; unit: string }
export interface DayData {
  schemaVersion: 1; day: string; activities: Activity[]; health: HealthMetric[]
  sources: SourceRef[]; coverage: Coverage[]
}
export interface ImportReport { imported: number; unchanged: number; pending: number; errors: string[] }
