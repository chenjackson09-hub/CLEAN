// How the cleaner sees the time left to answer a request: calm and rounded
// ("23 h to accept"), only counting minutes when it is genuinely close.
export type DeadlineLabel = { kind: 'expired' } | { kind: 'hours' | 'minutes'; n: number; tone: 'calm' | 'soon' | 'urgent' }

export function deadlineLabel(diffMs: number): DeadlineLabel {
  if (diffMs <= 0) return { kind: 'expired' }
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours >= 1) return { kind: 'hours', n: hours, tone: hours >= 6 ? 'calm' : 'soon' }
  return { kind: 'minutes', n: Math.max(1, Math.floor(diffMs / 60_000)), tone: 'urgent' }
}
