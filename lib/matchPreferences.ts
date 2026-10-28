// "Looking for" on a cleaner profile. A cleaner who ticked BOTH recurring and occasional
// work is happy with either, so it reads as one natural sentence instead of two bubbles.
export type MatchLabels = { recurring: string; occasional: string; either: string; other: string }

export function lookingForLabels(prefs: string[] | null | undefined, otherText: string | null | undefined, labels: MatchLabels): string[] {
  const list = prefs ?? []
  const out: string[] = []
  const recurring = list.includes('recurring')
  const occasional = list.includes('occasional')
  if (recurring && occasional) out.push(labels.either)
  else if (recurring) out.push(labels.recurring)
  else if (occasional) out.push(labels.occasional)
  if (list.includes('other')) out.push(otherText?.trim() || labels.other)
  return out
}
