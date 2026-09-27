import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { formatLocalDate } from './localDate'

describe('local completion dates', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'Asia/Manila')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('uses local date parts on both sides of local midnight', () => {
    expect(formatLocalDate(new Date('2026-09-27T15:59:59.999Z'))).toBe('2026-09-27')
    expect(formatLocalDate(new Date('2026-09-27T16:00:00.000Z'))).toBe('2026-09-28')
  })
})
