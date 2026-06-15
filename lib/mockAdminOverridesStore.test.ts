import { getOverrides, setNotes, removePerson, applyOverrides } from './mockAdminOverridesStore'

describe('mockAdminOverridesStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  const seed = [
    { id: '1', full_name: 'Alice' },
    { id: '2', full_name: 'Bob' },
  ]

  describe('getOverrides', () => {
    it('returns an empty object when nothing is stored', () => {
      expect(getOverrides('cleaners')).toEqual({})
    })
  })

  describe('setNotes', () => {
    it('stores notes for a person', () => {
      setNotes('cleaners', '1', 'Great cleaner')
      expect(getOverrides('cleaners')).toEqual({ '1': { notes: 'Great cleaner' } })
    })

    it('merges with an existing removed flag without clobbering it', () => {
      removePerson('cleaners', '1')
      setNotes('cleaners', '1', 'Great cleaner')
      expect(getOverrides('cleaners')).toEqual({ '1': { removed: true, notes: 'Great cleaner' } })
    })
  })

  describe('removePerson', () => {
    it('marks a person as removed', () => {
      removePerson('customers', '2')
      expect(getOverrides('customers')).toEqual({ '2': { removed: true } })
    })

    it('merges with existing notes without clobbering them', () => {
      setNotes('customers', '2', 'Frequent customer')
      removePerson('customers', '2')
      expect(getOverrides('customers')).toEqual({ '2': { notes: 'Frequent customer', removed: true } })
    })
  })

  describe('applyOverrides', () => {
    it('attaches adminNotes defaulting to an empty string', () => {
      expect(applyOverrides('cleaners', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: '' },
        { id: '2', full_name: 'Bob', adminNotes: '' },
      ])
    })

    it('attaches stored notes as adminNotes', () => {
      setNotes('cleaners', '1', 'Great cleaner')
      expect(applyOverrides('cleaners', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: 'Great cleaner' },
        { id: '2', full_name: 'Bob', adminNotes: '' },
      ])
    })

    it('filters out removed entries', () => {
      removePerson('cleaners', '2')
      expect(applyOverrides('cleaners', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: '' },
      ])
    })

    it('keeps overrides for different kinds separate', () => {
      removePerson('cleaners', '1')
      expect(applyOverrides('customers', seed)).toEqual([
        { id: '1', full_name: 'Alice', adminNotes: '' },
        { id: '2', full_name: 'Bob', adminNotes: '' },
      ])
    })
  })
})
