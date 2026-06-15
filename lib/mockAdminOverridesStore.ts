export type PersonKind = 'cleaners' | 'customers'

type Override = {
  removed?: boolean
  notes?: string
}

type OverridesMap = Record<string, Override>

function storageKey(kind: PersonKind): string {
  return `clean_admin_overrides_${kind}`
}

export function getOverrides(kind: PersonKind): OverridesMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(storageKey(kind))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveOverrides(kind: PersonKind, overrides: OverridesMap): void {
  window.localStorage.setItem(storageKey(kind), JSON.stringify(overrides))
}

export function setNotes(kind: PersonKind, id: string, notes: string): void {
  const overrides = getOverrides(kind)
  overrides[id] = { ...overrides[id], notes }
  saveOverrides(kind, overrides)
}

export function removePerson(kind: PersonKind, id: string): void {
  const overrides = getOverrides(kind)
  overrides[id] = { ...overrides[id], removed: true }
  saveOverrides(kind, overrides)
}

export function applyOverrides<T extends { id: string }>(kind: PersonKind, seed: T[]): (T & { adminNotes: string })[] {
  const overrides = getOverrides(kind)

  return seed
    .filter(person => !overrides[person.id]?.removed)
    .map(person => ({ ...person, adminNotes: overrides[person.id]?.notes ?? '' }))
}
