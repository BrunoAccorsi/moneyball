# Brand assets

Replaceable Moneyball brand files. Paths are hard-referenced from the app:

| File | Used by |
| --- | --- |
| `theme.css` | Copied into `src/styles/theme.css` (shadcn tokens). Keep both in sync when the palette changes. |
| `logo.svg` / `logo-dark.svg` | Header wordmark (`AppShell`) |
| `mark.svg` / `mark-dark.svg` | Compact header mark on small screens |
| `favicon.svg` / `favicon.ico` | Document head (also mirrored at `/favicon.*`) |
| `icon-192.png` / `icon-512.png` | PWA manifest |
| `apple-touch-icon.png` | Apple touch icon |
| `og-image.png` | Open Graph / Twitter image |

Logo, mark, and icon artwork may be swapped later without code changes beyond dropping new files here (and mirroring root favicon/icon/og copies if those change).
