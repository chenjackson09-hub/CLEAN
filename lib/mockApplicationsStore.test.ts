import { getStoredApplications, addApplication, getAllApplications, updateApplicationStatus } from './mockApplicationsStore'
import { MOCK_APPLICATIONS } from './mockData/applications'
import type { CleanerApplicationResult } from './types/application'

const application: CleanerApplicationResult = {
  id: 'new-1',
  full_name: 'Test Cleaner',
  email: 'test.cleaner@example.com',
  phone: '050-000-0000',
  bio: 'A test bio.',
  service_types: ['residential'],
  hourly_rate: 60,
  years_experience: 1,
  languages: ['EN'],
  address: '1 Test St',
  status: 'pending',
  submitted_at: '2026-06-13',
  id_document_url: null,
  admin_notes: null,
}

describe('mockApplicationsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns an empty array when nothing has been stored', () => {
    expect(getStoredApplications()).toEqual([])
  })

  it('returns an application after it has been added', () => {
    addApplication(application)

    expect(getStoredApplications()).toEqual([application])
  })

  it('prepends newly added applications so the newest is first', () => {
    addApplication(application)
    addApplication({ ...application, id: 'new-2', full_name: 'Another Cleaner' })

    const stored = getStoredApplications()
    expect(stored[0].id).toBe('new-2')
    expect(stored[1].id).toBe('new-1')
  })

  describe('getAllApplications', () => {
    it('returns the seed applications when nothing has been stored', () => {
      expect(getAllApplications()).toEqual(MOCK_APPLICATIONS)
    })

    it('includes newly added applications alongside the seed applications', () => {
      addApplication(application)

      const all = getAllApplications()
      expect(all[0]).toEqual(application)
      expect(all).toHaveLength(MOCK_APPLICATIONS.length + 1)
    })
  })

  describe('updateApplicationStatus', () => {
    it('updates the status of a stored application', () => {
      addApplication(application)
      updateApplicationStatus('new-1', 'approved')

      const all = getAllApplications()
      expect(all.find(a => a.id === 'new-1')?.status).toBe('approved')
    })

    it('promotes a seed application into storage with the new status', () => {
      const seedId = MOCK_APPLICATIONS[0].id
      updateApplicationStatus(seedId, 'rejected')

      const all = getAllApplications()
      const updated = all.find(a => a.id === seedId)
      expect(updated?.status).toBe('rejected')
      expect(all).toHaveLength(MOCK_APPLICATIONS.length)
    })
  })
})
