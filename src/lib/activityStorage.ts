import { z } from 'zod'
import {
  DEFAULT_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
} from './answerTimer'
import { formatLocalDate } from './localDate'

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

export type ActivityImportResult =
  | { ok: true; data: ActivityData }
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

export function serializeActivityData(data: ActivityData): string | null {
  const validatedData = validateActivityData(data)

  return validatedData ? JSON.stringify(validatedData) : null
}

export function createActivityBackupFilename(date: Date): string {
  return `interview-spin-backup-${formatLocalDate(date)}.json`
}

export function downloadActivityData(data: ActivityData, date = new Date()): boolean {
  const serializedData = serializeActivityData(data)

  if (!serializedData) {
    return false
  }

  try {
    const url = URL.createObjectURL(
      new Blob([serializedData], { type: 'application/json' }),
    )
    const link = document.createElement('a')

    link.href = url
    link.download = createActivityBackupFilename(date)
    link.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseActivityDataJson(value: string): ActivityImportResult {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(value)
  } catch {
    return { ok: false, message: 'The selected backup is not valid JSON.' }
  }

  if (isRecord(parsedValue) && parsedValue.version !== 1) {
    return {
      ok: false,
      message: 'This Interview Spin backup uses an unsupported schema version.',
    }
  }

  const data = validateActivityData(parsedValue)

  if (!data) {
    return {
      ok: false,
      message:
        'This backup contains invalid Interview Spin progress. Check its timer setting, dates, and answer counts.',
    }
  }

  return { ok: true, data }
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
