# Moneyball brand

**Mark:** a deep money-green baseball that doubles as a coin: a faint coin rim, two classic curved seams with stitch ticks tilted -35°, and a vertical bar through the centre so the seams read as a subtle $. At favicon sizes (16/32px) the rim and ticks are dropped and the seams and bar are thicker.
**Wordmark:** "money" in ink + "ball" in green, set in Manrope 700 and converted to outlines (no font dependency).

## Font
- **Manrope** (Google Fonts): 400/500 for UI, 600/700 for headings and numbers. Turn on `font-variant-numeric: tabular-nums` for amounts.
- Fallback: `ui-sans-serif, system-ui, sans-serif`.

## Usage
- Use `logo.svg` on light/paper backgrounds and `logo-dark.svg` on dark ones (its "ball" uses the brighter green #3FB074).
- `mark-dark.svg` uses night-coloured seams for dark UI chrome. Keep clear space of at least half the mark's width. Never recolour the mark to teal or mint.
- Green is the only strong accent. Keep backgrounds warm neutral (paper). Coral is a chart colour only; don't use it for actions.
- Formatting for money is CAD: `Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'})`.

## Palette
| Name | Hex | OKLCH | Use |
|---|---|---|---|
| Green | #16774A | oklch(0.504 0.112 157.2) | primary, chart-1 (light) |
| Green (dark mode) | #3FB074 | oklch(0.678 0.136 156.4) | primary / chart-1 (dark) |
| Ink | #1F2330 | oklch(0.258 0.025 271.3) | text |
| Paper | #F7F4EF | oklch(0.968 0.007 80.7) | background |
| Night | #15171D | oklch(0.205 0.012 270.8) | dark background |
| Blue | #4C7BD9 | oklch(0.596 0.153 262.7) | chart-2 |
| Amber | #E8A23A | oklch(0.763 0.141 72.8) | chart-3 |
| Coral | #E4664F | oklch(0.661 0.162 32.1) | chart-4 |
| Slate | #7A8394 | oklch(0.608 0.028 263.2) | chart-5 |
| Destructive | #C42B3A | oklch(0.540 0.188 21.5) | errors / delete |

Contrast (WCAG): white on green is 5.57:1 (AA). Dark mode: #0C1A12 on #3FB074 is 6.55:1. Text on background is 14.3:1. Muted text is 5.2:1.

## Files
logo.svg, logo-dark.svg, mark.svg, mark-dark.svg, favicon.svg, favicon.ico (16/32/48), icon-192.png, icon-512.png, apple-touch-icon.png (full-bleed green with the mark in the 60% maskable safe zone), og-image.png (1280x640), theme.css (shadcn tokens), brand-sheet.png (preview). To regenerate, run build.py and tok.py (venv at /workspace/.venv; needs Manrope at /workspace/manrope.ttf).
