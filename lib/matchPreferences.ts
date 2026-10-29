// "Looking for" on a cleaner profile. A cleaner who ticked BOTH recurring and occasional
// work ("either is fine") gets BOTH options written out, so a host never has to guess what
// "either" refers to.
export type MatchLabels = { recurring: string; occasional: string; other: string }

export function lookingForLabels(prefs: string[] | null | undefined, otherText: string | null | undefined, labels: MatchLabels): string[] {
  const list = prefs ?? []
  const out: string[] = []
  const recurring = list.includes('recurring')
  const occasional = list.includes('occasional')
  if (recurring) out.push(labels.recurring)
  if (occasional) out.push(labels.occasional)
  if (list.includes('other')) out.push(otherText?.trim() || labels.other)
  return out
}
