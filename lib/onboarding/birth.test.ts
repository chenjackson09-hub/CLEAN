import { ageFromParts, birthProblem } from './birth'

const NOW = new Date('2026-10-29T12:00:00')
describe('birthProblem', () => {
  it('waits until all three parts are picked', () => {
    expect(birthProblem('5', '', '1995', NOW)).toBe('incomplete')
  })
  it('rejects dates that do not exist or are far too old', () => {
    expect(birthProblem('31', '2', '1995', NOW)).toBe('invalid')
    expect(birthProblem('1', '1', '1900', NOW)).toBe('invalid')
  })
  it('rejects anyone under 14, accepts 14 and over', () => {
    expect(birthProblem('30', '10', '2012', NOW)).toBe('tooYoung')
    expect(birthProblem('29', '10', '2012', NOW)).toBeNull()
    expect(birthProblem('5', '3', '1995', NOW)).toBeNull()
  })
})
describe('ageFromParts', () => {
  it('counts a birthday that has not happened yet this year', () => {
    expect(ageFromParts('30', '10', '2000', NOW)).toBe(25)
    expect(ageFromParts('29', '10', '2000', NOW)).toBe(26)
  })
})
