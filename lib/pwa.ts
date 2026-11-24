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

/**
 * The install steps only exist in Safari (and, on newer iPhones, Chrome's own share menu). Inside
 * another app's built-in browser (Instagram, Facebook, Gmail…) there is no "Add to Home Screen" at
 * all, so the guide tells the person to open the page in Safari first.
 */
export function isIosInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|Instagram|Line\/|GSA\/|Snapchat|MicroMessenger|WhatsApp/i.test(userAgent)
}

export type IosBrowserLayout = "dots" | "share" | "chrome"

/**
 * Where the buttons are, so the walkthrough can say the right thing:
 *  - "dots"   Safari 26+ (floating bottom bar: back · address · ⋯). Share is inside the ⋯ menu.
 *  - "share"  older Safari (bottom toolbar with a Share button in the middle).
 *  - "chrome" Chrome on iPhone (Share is in the address bar at the top).
 */
export function iosBrowserLayout(userAgent: string): IosBrowserLayout {
  if (/CriOS/i.test(userAgent)) return "chrome"
  const v = /Version\/(\d+)/.exec(userAgent)
  return v && Number(v[1]) >= 26 ? "dots" : "share"
}

export type GuideLayout = IosBrowserLayout | "android"

/** Which walkthrough to show on this phone (Android has its own: Chrome's ⋯ menu is at the top). */
export function installGuideLayout(userAgent: string): GuideLayout {
  return isAndroidDevice(userAgent) ? "android" : iosBrowserLayout(userAgent)
}
