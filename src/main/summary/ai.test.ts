import { expect, it } from 'vitest'
import { requestInsights } from './ai'
import type { DayData } from '../../shared/archive'
const data: DayData = { schemaVersion: 1, day: '2026-11-07', activities: [{ id: 'x', sport: 'cycling', startedAt: '2026-11-07T06:15:29Z', durationSeconds: 100, distanceMeters: 1000 }], health: [], coverage: [], sources: [{ sha256: 'secret-serial', sourcePath: 'GPS: 50.123, 20.123', originalName: 'private.fit', kind: 'Activity' }] }
it('sends only bounded aggregates, never source paths or identifiers', async () => {
  let payload = ''
  const fake = async (_url: string, init?: RequestInit): Promise<Response> => {
    payload = String(init?.body)
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"commentary":"A steady ride across comparable days.","dates":["2026-11-07"]}' } }] }), { status: 200 })
  }
  const result = await requestInsights(data, [], { endpoint: 'https://example.org/v1/chat/completions', model: 'test', keyRef: 'GARMIN_AI_KEY' }, fake as typeof fetch, { GARMIN_AI_KEY: 'token' })
  expect(result).toContain('steady ride')
  expect(payload).not.toContain('secret-serial')
  expect(payload).not.toContain('50.123')
  expect(payload).not.toContain('private.fit')
})
it('drops unsupported or ungrounded AI responses', async () => {
  const fake = async (): Promise<Response> => new Response(JSON.stringify({ choices: [{ message: { content: '{"commentary":"Your pulse reached 9999 bpm.","dates":["2030-01-01"]}' } }] }), { status: 200 })
  expect(await requestInsights(data, [], { endpoint: 'https://example.org', model: 'test', keyRef: 'KEY' }, fake as typeof fetch, { KEY: 'x' })).toBeNull()
})
