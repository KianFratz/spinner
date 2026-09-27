import { z } from 'zod'
import {
  DEFAULT_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from './answerTimer'

export const ACTIVITY_STORAGE_KEY = 'interview-spin:v1'

const invalidStoredDataMessage =
  'Your saved practice data could not be loaded. Replace it to save new progress.'
const unavailableStoredDataMessage =
  'Your saved practice data could not be loaded because browser storage is unavailable.'
const failedWriteMessage = 'Your progress could not be saved in this browser.'

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function isRealCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysByMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysByMonth[month - 1]
}

const localDateSchema = z.string().refine(isRealCalendarDate)

const activityDataSchema = z
  .object({
    version: z.literal(1),
    timerSeconds: z.number().int().min(MIN_DURATION_SECONDS).max(MAX_DURATION_SECONDS),
    activityByDate: z.record(localDateSchema, z.number().int().nonnegative()),
  })
  .strict()

export type ActivityData = z.infer<typeof activityDataSchema>

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>

export type ActivityLoadResult = {
  data: ActivityData
  needsRecovery: boolean
  recoveryMessage: string | null
}

export type ActivitySaveResult =
  | { ok: true }
  | { ok: false; message: string }

export function createDefaultActivityData(): ActivityData {
  return {
    version: 1,
    timerSeconds: DEFAULT_DURATION_SECONDS,
    activityByDate: {},
  }
}

export function validateActivityData(value: unknown): ActivityData | null {
  const result = activityDataSchema.safeParse(value)

  return result.success ? result.data : null
}

export function loadActivityData(storage: StorageAccess): ActivityLoadResult {
  let storedValue: string | null

  try {
    storedValue = storage.getItem(ACTIVITY_STORAGE_KEY)
  } catch {
    return {
      data: createDefaultActivityData(),
      needsRecovery: true,
      recoveryMessage: unavailableStoredDataMessage,
    }
  }

  if (storedValue === null) {
    return {
      data: createDefaultActivityData(),
      needsRecovery: false,
      recoveryMessage: null,
    }
  }

  try {
    const data = validateActivityData(JSON.parse(storedValue))

    if (data) {
      return { data, needsRecovery: false, recoveryMessage: null }
    }
  } catch {
    // The shared recovery result below handles invalid JSON and invalid shapes alike.
  }

  return {
    data: createDefaultActivityData(),
    needsRecovery: true,
    recoveryMessage: invalidStoredDataMessage,
  }
}

export function loadBrowserActivityData(): ActivityLoadResult {
  try {
    return loadActivityData(window.localStorage)
  } catch {
    return {
      data: createDefaultActivityData(),
      needsRecovery: true,
      recoveryMessage: unavailableStoredDataMessage,
    }
  }
}

export function saveActivityData(
  storage: StorageAccess,
  data: ActivityData,
): ActivitySaveResult {
  const validatedData = validateActivityData(data)

  if (!validatedData) {
    return { ok: false, message: failedWriteMessage }
  }

  try {
    storage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(validatedData))
    return { ok: true }
  } catch {
    return { ok: false, message: failedWriteMessage }
  }
}

export function saveBrowserActivityData(data: ActivityData): ActivitySaveResult {
  try {
    return saveActivityData(window.localStorage, data)
  } catch {
    return { ok: false, message: failedWriteMessage }
  }
}
