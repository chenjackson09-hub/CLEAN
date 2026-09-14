// Muted, low-saturation palette for "Add a clean" color-tagging — deliberately
// softer than a typical vibrant UI palette (dusty/desaturated tones), and
// drawn from the same soft-pastel family as the admin panel's own palette
// (teal #75C9C8, blue #80A1D4, lilac #C0B9DD) for visual consistency with the
// rest of the app's few non-default-Tailwind colors.
export const CLEAN_COLORS = [
  '#7EB6B0', // dusty teal
  '#8FA8D1', // dusty blue
  '#B7A8D9', // dusty lilac
  '#9BB88A', // sage green
  '#D3A2A8', // dusty rose
  '#D0AD7A', // warm sand
]

export function nextCleanColor(used: string[]): string {
  return CLEAN_COLORS.find(c => !used.includes(c)) ?? CLEAN_COLORS[used.length % CLEAN_COLORS.length]
}
