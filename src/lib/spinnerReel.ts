export const WHEEL_LABELS = [
  'React',
  'APIs',
  'Testing',
  'Behavioral',
  'SQL',
  'System design',
] as const

export const REEL_ITEM_HEIGHT = 56
export const REEL_CENTER_INDEX = 1
const REEL_TARGET_CYCLES = 3

export function buildSettledReel(selectedLabel: string): string[] {
  const otherLabels = WHEEL_LABELS.filter((label) => label !== selectedLabel)

  return [
    otherLabels[0] ?? selectedLabel,
    selectedLabel,
    ...otherLabels.slice(1, WHEEL_LABELS.length - 1),
  ]
}

export function buildSpinningReel(selectedLabel: string | null): string[] {
  if (!selectedLabel) {
    return [...WHEEL_LABELS, ...WHEEL_LABELS]
  }

  const settledReel = buildSettledReel(selectedLabel)

  return [
    ...WHEEL_LABELS,
    ...settledReel,
    ...settledReel,
    ...settledReel,
  ]
}

export function getReelStopOffset(selectedLabel: string | null): number {
  if (!selectedLabel) {
    return 0
  }

  return -(WHEEL_LABELS.length * REEL_TARGET_CYCLES * REEL_ITEM_HEIGHT)
}
