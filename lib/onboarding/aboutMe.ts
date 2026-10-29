// "Tell hosts about yourself" is written from a few short prompts. Nothing is invented: the
// text is exactly what the person typed, joined in order and kept within the length limit.
export const ABOUT_MAX = 500

export function assembleAbout(answers: string[], max: number = ABOUT_MAX): string {
  const text = answers.map((a) => a.trim()).filter(Boolean).join(' ')
  return text.length > max ? text.slice(0, max).trimEnd() : text
}

// Tapping a starter fills an EMPTY prompt with the start of a sentence; it never replaces
// something the person already typed.
export function applyStarter(current: string, starter: string): string {
  return current.trim() === '' ? `${starter} ` : current
}
