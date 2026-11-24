// Small, pure helpers for the "install Cindy on your phone" hint.

/** iPhone / iPad (iPadOS reports itself as a Mac with a touch screen). */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/** Android phone/tablet. */
export function isAndroidDevice(userAgent: string): boolean {
  return /Android/i.test(userAgent)
}

export type InstallHint = "none" | "ios" | "android"

/**
 * Which hint to show. Never inside the installed app, never once dismissed, never on a computer.
 * Android only gets the hint when the browser has actually offered an install button
 * (`canPrompt`); iPhone has no such button, so it always gets the written steps.
 */
export function installHintFor(opts: {
  standalone: boolean
  dismissed: boolean
  ios: boolean
  android: boolean
  canPrompt: boolean
}): InstallHint {
  if (opts.standalone || opts.dismissed) return "none"
  if (opts.ios) return "ios"
  if (opts.android && opts.canPrompt) return "android"
  return "none"
}
