import { lookingForLabels } from './matchPreferences'

const L = { recurring: 'A regular family', occasional: 'Jobs once in a while', other: 'Other' }

describe('lookingForLabels', () => {
  it('writes both options out when both are picked ("either is fine")', () => {
    expect(lookingForLabels(['recurring', 'occasional'], null, L)).toEqual([L.recurring, L.occasional])
    expect(lookingForLabels(['occasional', 'recurring'], null, L)).toEqual([L.recurring, L.occasional])
  })
  it('keeps a single choice as it is', () => {
    expect(lookingForLabels(['recurring'], null, L)).toEqual([L.recurring])
    expect(lookingForLabels(['occasional'], null, L)).toEqual([L.occasional])
  })
  it('adds the cleaner\'s own words for "other", or a generic label', () => {
    expect(lookingForLabels(['occasional', 'other'], 'Weekend work', L)).toEqual([L.occasional, 'Weekend work'])
    expect(lookingForLabels(['other'], '  ', L)).toEqual(['Other'])
    expect(lookingForLabels(['recurring', 'occasional', 'other'], 'Weekend work', L)).toEqual([L.recurring, L.occasional, 'Weekend work'])
  })
  it('is empty when nothing is picked', () => {
    expect(lookingForLabels([], null, L)).toEqual([])
    expect(lookingForLabels(undefined, null, L)).toEqual([])
  })
})
