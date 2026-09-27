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
    const nextData = { ...data, timerSeconds }
    setData(nextData)
    return persist(nextData)
  }

  function recordCompletion(localDate: string) {
    const nextData = {
      ...data,
      activityByDate: {
        ...data.activityByDate,
        [localDate]: (data.activityByDate[localDate] ?? 0) + 1,
      },
    }

    setData(nextData)
    return persist(nextData)
  }

  function retrySave() {
    const result = saveBrowserActivityData(pendingDataRef.current ?? data)

    if (!result.ok) {
      setStorageMessage(result.message)
      return false
    }

    pendingDataRef.current = null
    setNeedsRecovery(false)
    setStorageMessage(null)
    return true
  }

  return {
    data,
    needsRecovery,
    storageMessage,
    setTimerSeconds,
    recordCompletion,
    retrySave,
  }
}
