import { expect, it } from 'vitest'
import { validateDay, validateSettings } from './ipc'
it('rejects path traversal and invalid setting paths', () => {
  expect(() => validateDay('../../private')).toThrow()
  expect(() => validateSettings({ archiveRoot: '' })).toThrow()
  expect(() => validateSettings({ ai: { endpoint: 'file:///secret', model: 'x', keyRef: 'KEY' } })).toThrow()
})
it('permits a day and configured mount folder', () => {
  expect(validateDay('2026-11-07')).toBe('2026-11-07')
  expect(validateSettings({ archiveRoot: 'G:\\My Drive\\GarminData' }).archiveRoot).toBe('G:\\My Drive\\GarminData')
})
