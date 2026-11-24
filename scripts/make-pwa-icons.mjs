// Draws the PLACEHOLDER app icon (a soft-faded "C") into public/icons.
// Run `node scripts/make-pwa-icons.mjs` after changing the SVG below. When the real Cindy logo
// exists, replace the four PNGs in public/icons with exports of it (same names and sizes) and
// this script is no longer needed.
//   icon-192.png / icon-512.png   – "any" icons (Android install, browsers)
//   icon-maskable-512.png         – Android "maskable" (the OS crops it to a circle/squircle, so the
//                                   artwork stays inside the central 80%)
//   apple-touch-icon.png (180)    – iPhone Home Screen
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1D4ED8"/>
      <stop offset="1" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="fade" x1="0.15" y1="0.2" x2="0.9" y2="0.85">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <path d="M351.1 170.4 A128 128 0 1 0 351.1 341.6" fill="none" stroke="url(#fade)" stroke-width="60" stroke-linecap="round"/>
</svg>`

mkdirSync('public/icons', { recursive: true })
const render = (size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`)

await Promise.all([
  render(192, 'icon-192.png'),
  render(512, 'icon-512.png'),
  render(512, 'icon-maskable-512.png'),
  render(180, 'apple-touch-icon.png'),
])
console.log('icons written to public/icons')
