import { useRef, useState } from 'react'
import {
  loadBrowserActivityData,
  saveBrowserActivityData,
  type ActivityData,
} from '../lib/activityStorage'

export function useActivityData() {
  const [initialLoad] = useState(loadBrowserActivityData)
  const [data, setData] = useState(initialLoad.data)
  const [needsRecovery, setNeedsRecovery] = useState(initialLoad.needsRecovery)
  const [storageMessage, setStorageMessage] = useState(initialLoad.recoveryMessage)
  const pendingDataRef = useRef<ActivityData | null>(null)

  function persist(nextData: ActivityData) {
    if (needsRecovery) {
      pendingDataRef.current = nextData
      return false
    }

    const result = saveBrowserActivityData(nextData)

    if (result.ok) {
      pendingDataRef.current = null
      setStorageMessage(null)
      return true
    }

    pendingDataRef.current = nextData
    setStorageMessage(result.message)
    return false
  }

  function setTimerSeconds(timerSeconds: number) {
    const nextData = { ...(pendingDataRef.current ?? data), timerSeconds }
    const saved = persist(nextData)

    if (saved) {
      setData(nextData)
    }

    return saved
  }

  function recordCompletion(localDate: string) {
    const currentData = pendingDataRef.current ?? data
    const nextData = {
      ...currentData,
      activityByDate: {
        ...currentData.activityByDate,
        [localDate]: (currentData.activityByDate[localDate] ?? 0) + 1,
      },
    }

    const saved = persist(nextData)

    if (saved) {
      setData(nextData)
    }

    return saved
  }

  function applyPersistedData(nextData: ActivityData) {
    pendingDataRef.current = null
    setData(nextData)
    setNeedsRecovery(false)
    setStorageMessage(null)
  }

  function retrySave() {
    const nextData = pendingDataRef.current ?? data
    const result = saveBrowserActivityData(nextData)

    if (!result.ok) {
      setStorageMessage(result.message)
      return false
    }

    applyPersistedData(nextData)
    return true
  }

  function replaceData(nextData: ActivityData) {
    const result = saveBrowserActivityData(nextData)

    if (!result.ok) {
      setStorageMessage(
        'The imported backup could not be saved. Your current progress was kept.',
      )
      return false
    }

    applyPersistedData(nextData)
    return true
  }

  return {
    data,
    needsRecovery,
    storageMessage,
    setTimerSeconds,
    recordCompletion,
    retrySave,
    replaceData,
  }
}
