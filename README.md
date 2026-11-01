# Moneyball

Personal budget web app. Import bank CSVs, categorize spending with rules, and explore insights.

## Stack

- TanStack Start (React)
- tRPC
- Drizzle + PostgreSQL
- Biome (lint/format)
- shadcn/ui + Recharts
- Fuse.js fuzzy search

## Quick start

```bash
cp .env.example .env.local
docker compose up -d db
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

App: http://localhost:3000

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm typecheck` | TypeScript |
| `pnpm check` | Biome |
| `pnpm test` | Unit tests (import, categories, overview math) |
| `pnpm db:push` | Push schema |
| `pnpm db:seed` | Seed categories/rules/accounts |

## Import sources

Strategy pattern under `src/domain/import`:

- `neo-credit-csv` — Neo credit card CSV
- `scotia-chequing-csv` — Scotiabank chequing CSV
- `scotia-credit-csv` — Scotiabank credit CSV
- `neo-everyday-pdf` — Neo Chequing and Everyday statement PDFs

Auto-detection picks a strategy from headers. Imports dedupe by fingerprint.

Sample fixtures live in `fixtures/`. Categorization seeds come from `fixtures/rules.md`.

## Deploy (Dokploy / Traefik)

`docker compose up --build` runs Postgres + the Nitro app. Traefik labels are on the `app` service; point a host at port 3000 or let Traefik route `moneyball.localhost`.

Set `DATABASE_URL`. Monthly reviews run when `CURSOR_API_KEY` is set (optional `CURSOR_MODEL`, default `composer-2`). With no key, Overview shows how to add one. Run `pnpm db:push` after pulling so the savings target and review cache tables exist.

## Brand

Tokens live in `src/styles/theme.css` (synced from `public/brand/theme.css`). UI font is Manrope; amounts use tabular figures. Logos/icons under `public/brand/` are path-referenced and safe to replace in place.

## AI reviews

Overview asks the Cloud Agents API (`POST /v1/agents`, model `composer-2`) for a monthly review from aggregated totals and merchant names. Reviews are cached per month. Set `CURSOR_API_KEY` on the server. `CURSOR_MODEL` is optional.
