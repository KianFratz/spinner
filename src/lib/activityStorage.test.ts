import { describe, expect, it, vi } from 'vitest'
import {
  ACTIVITY_STORAGE_KEY,
  createDefaultActivityData,
  loadBrowserActivityData,
  loadActivityData,
  saveBrowserActivityData,
  saveActivityData,
  validateActivityData,
} from './activityStorage'

describe('activity document validation', () => {
  const validDocument = {
    version: 1,
    timerSeconds: 90,
    activityByDate: {
      '2024-02-29': 2,
      '2026-09-27': 0,
    },
  }

  it('accepts the exact supported document shape', () => {
    expect(validateActivityData(validDocument)).toEqual(validDocument)
  })

  it.each([
    ['unsupported version', { ...validDocument, version: 2 }],
    ['duration below the supported range', { ...validDocument, timerSeconds: 29 }],
    ['fractional duration', { ...validDocument, timerSeconds: 60.5 }],
    ['impossible calendar date', { ...validDocument, activityByDate: { '2026-02-29': 1 } }],
    ['loosely formatted date', { ...validDocument, activityByDate: { '2026-9-27': 1 } }],
    ['negative count', { ...validDocument, activityByDate: { '2026-09-27': -1 } }],
    ['fractional count', { ...validDocument, activityByDate: { '2026-09-27': 1.5 } }],
    ['unknown field', { ...validDocument, answers: [] }],
  ])('rejects %s', (_description, value) => {
    expect(validateActivityData(value)).toBeNull()
  })
})

describe('activity storage', () => {
  it('uses defaults when no document exists without writing to storage', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    }

    expect(loadActivityData(storage)).toEqual({
      data: createDefaultActivityData(),
      needsRecovery: false,
      recoveryMessage: null,
    })
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('falls back with a persistent recovery signal without overwriting malformed data', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('{"version":2}'),
      setItem: vi.fn(),
    }

    const result = loadActivityData(storage)

    expect(result.data).toEqual(createDefaultActivityData())
    expect(result.needsRecovery).toBe(true)
    expect(result.recoveryMessage).toMatch(/could not be loaded/i)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('reports blocked reads and failed writes without throwing', () => {
    const readFailure = loadActivityData({
      getItem: vi.fn(() => {
        throw new DOMException('Blocked', 'SecurityError')
      }),
      setItem: vi.fn(),
    })
    const writeStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new DOMException('Full', 'QuotaExceededError')
      }),
    }

    expect(readFailure.needsRecovery).toBe(true)
    expect(saveActivityData(writeStorage, createDefaultActivityData())).toEqual({
      ok: false,
      message: 'Your progress could not be saved in this browser.',
    })
  })

  it('handles failures while acquiring browser storage itself', () => {
    vi.stubGlobal(
      'window',
      Object.defineProperty({}, 'localStorage', {
        get() {
          throw new DOMException('Blocked', 'SecurityError')
        },
      }),
    )

    expect(loadBrowserActivityData().needsRecovery).toBe(true)
    expect(saveBrowserActivityData(createDefaultActivityData())).toEqual({
      ok: false,
      message: 'Your progress could not be saved in this browser.',
    })

    vi.unstubAllGlobals()
  })

  it('writes only the versioned aggregate document under the stable key', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    }
    const data = {
      version: 1 as const,
      timerSeconds: 120,
      activityByDate: { '2026-09-27': 3 },
    }

    expect(saveActivityData(storage, data)).toEqual({ ok: true })
    expect(storage.setItem).toHaveBeenCalledWith(ACTIVITY_STORAGE_KEY, JSON.stringify(data))
  })
})
