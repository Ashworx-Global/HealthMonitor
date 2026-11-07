import { expect, it } from 'vitest'
import { updateManagedSummary } from './write'
it('preserves user prose outside the generated block', () => {
  const first = updateManagedSummary(null, 'Old facts', null)
  const updated = updateManagedSummary(`My own note\n\n${first}\nAfterword`, 'New facts', 'Good consistency')
  expect(updated).toContain('My own note')
  expect(updated).toContain('Afterword')
  expect(updated).toContain('New facts')
  expect(updated).not.toContain('Old facts')
})
