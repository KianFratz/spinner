import { describe, expect, it } from 'vitest'
import {
  REEL_CENTER_INDEX,
  REEL_ITEM_HEIGHT,
  buildSpinningReel,
  getReelStopOffset,
} from './spinnerReel'

describe('spinner reel stopping', () => {
  it.each(['APIs', 'Testing', 'SQL / PostgreSQL', 'Collaboration'])(
    'centers the chosen topic at the final animation offset for %s',
    (selectedLabel) => {
      const labels = buildSpinningReel(selectedLabel)
      const stopOffset = getReelStopOffset(selectedLabel)
      const centeredIndex = REEL_CENTER_INDEX - stopOffset / REEL_ITEM_HEIGHT

      expect(labels[centeredIndex]).toBe(selectedLabel)
    },
  )
})
