import { ABOUT_MAX, applyStarter, assembleAbout } from './aboutMe'

describe('assembleAbout', () => {
  it('joins the typed answers in order, skipping empty prompts', () => {
    expect(assembleAbout(['I clean homes.', '', ' I bring my own supplies. '])).toBe('I clean homes. I bring my own supplies.')
  })
  it('is empty when nothing was typed', () => {
    expect(assembleAbout(['', '  '])).toBe('')
  })
  it('never exceeds the limit', () => {
    expect(assembleAbout(['x'.repeat(ABOUT_MAX + 50)]).length).toBe(ABOUT_MAX)
  })
})

describe('applyStarter', () => {
  it('fills an empty prompt with the start of a sentence', () => {
    expect(applyStarter('', 'I take pride in')).toBe('I take pride in ')
    expect(applyStarter('   ', 'I take pride in')).toBe('I take pride in ')
  })
  it('leaves what the person already typed alone', () => {
    expect(applyStarter('Already wrote this', 'I take pride in')).toBe('Already wrote this')
  })
})
