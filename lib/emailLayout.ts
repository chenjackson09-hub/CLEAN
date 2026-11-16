// The shared shape of the app's own emails: ONE message in both languages, Hebrew first (the
// server doesn't know which language the recipient uses in the app). Pure — no sending here.

export type EmailLink = { href: string; label: string }
export type EmailBlock = {
  hello: string
  // The first line is the headline (bold); the rest are ordinary paragraphs. Empty lines are dropped.
  lines: string[]
  // Words a person typed (shown in a grey box, exactly as written).
  quote?: { label: string; text: string } | null
  links?: (EmailLink | null)[]
}

const FOOTER = {
  he: 'זוהי הודעה אוטומטית מ-Clean, אין להשיב לה. ליצירת קשר אפשר להשתמש בכפתור העזרה באפליקציה.',
  en: "This is an automatic message from Clean, so please don't reply to it. To get in touch, use the Help button in the app.",
}

export function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

export function hello(name: string | null | undefined): { he: string; en: string } {
  const first = firstName(name)
  return { he: first ? `שלום ${first},` : 'שלום,', en: first ? `Hi ${first},` : 'Hi,' }
}

function htmlBlock(block: EmailBlock, dir: 'rtl' | 'ltr', footer: string): string {
  const lines = block.lines.filter(Boolean)
  const links = (block.links ?? []).filter((l): l is EmailLink => !!l && !!l.href)
  return [
    `<div dir="${dir}" style="text-align:${dir === 'rtl' ? 'right' : 'left'}">`,
    `<p style="margin:0 0 10px">${esc(block.hello)}</p>`,
    ...lines.map((line, i) => `<p style="margin:0 0 10px">${i === 0 ? `<strong>${esc(line)}</strong>` : esc(line)}</p>`),
    block.quote?.text
      ? `<p style="margin:0 0 4px">${esc(block.quote.label)}</p><p style="margin:0 0 10px;padding:8px 12px;background:#f3f4f6;border-radius:8px;white-space:pre-wrap">${esc(block.quote.text)}</p>`
      : '',
    ...links.map((l) => `<p style="margin:6px 0"><a href="${esc(l.href)}" style="color:#2563eb">${esc(l.label)}</a></p>`),
    `<p style="margin:14px 0 0;color:#6b7280;font-size:12px">${esc(footer)}</p>`,
    `</div>`,
  ].join('')
}

function textBlock(block: EmailBlock, footer: string): string {
  const links = (block.links ?? []).filter((l): l is EmailLink => !!l && !!l.href)
  return [
    block.hello,
    '',
    ...block.lines.filter(Boolean),
    ...(block.quote?.text ? [`${block.quote.label} ${block.quote.text}`] : []),
    ...links.map((l) => `${l.label}: ${l.href}`),
    '',
    footer,
  ].join('\n')
}

export function bilingualEmail(subject: string, he: EmailBlock, en: EmailBlock): { subject: string; html: string; text: string } {
  return {
    subject,
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:520px">` +
      htmlBlock(he, 'rtl', FOOTER.he) +
      `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">` +
      htmlBlock(en, 'ltr', FOOTER.en) +
      `</div>`,
    text: `${textBlock(he, FOOTER.he)}\n\n----------\n\n${textBlock(en, FOOTER.en)}`,
  }
}
