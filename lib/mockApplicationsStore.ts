import { MOCK_APPLICATIONS } from './mockData/applications'
import type { ApplicationStatus, CleanerApplicationResult } from './types/application'

const STORAGE_KEY = 'clean_mock_applications'

export function getStoredApplications(): CleanerApplicationResult[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addApplication(application: CleanerApplicationResult): void {
  const existing = getStoredApplications()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([application, ...existing]))
}

export function getAllApplications(): CleanerApplicationResult[] {
  const stored = getStoredApplications()
  const storedIds = new Set(stored.map(a => a.id))
  return [...stored, ...MOCK_APPLICATIONS.filter(a => !storedIds.has(a.id))]
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): void {
  const stored = getStoredApplications()
  const existing = stored.find(a => a.id === id)

  if (existing) {
    const updated = stored.map(a => (a.id === id ? { ...a, status } : a))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return
  }

  const seed = MOCK_APPLICATIONS.find(a => a.id === id)
  if (!seed) return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...seed, status }, ...stored]))
}
