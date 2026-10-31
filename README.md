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
| `pnpm test` | Unit tests (import + categorization) |
| `pnpm db:push` | Push schema |
| `pnpm db:seed` | Seed categories/rules/accounts |

## Import sources

Strategy pattern under `src/domain/import`:

- `neo-credit-csv` — Neo credit card CSV
- `scotia-chequing-csv` — Scotiabank chequing CSV
- `scotia-credit-csv` — Scotiabank credit CSV
- `neo-everyday-pdf` — skeleton only (detects, does not parse)

Auto-detection picks a strategy from headers. Imports dedupe by fingerprint.

Sample fixtures live in `fixtures/`. Categorization seeds come from `fixtures/rules.md`.

## Deploy (Dokploy / Traefik)

`docker compose up --build` runs Postgres + the Nitro app. Traefik labels are on the `app` service; point a host at port 3000 or let Traefik route `moneyball.localhost`.

Set `DATABASE_URL` and keep `AI_INSIGHTS_PROVIDER=null` unless you wire the Cursor SDK provider.

## Brand

Tokens live in `src/styles/theme.css` (synced from `public/brand/theme.css`). UI font is Manrope; amounts use tabular figures. Logos/icons under `public/brand/` are path-referenced and safe to replace in place.

## Stubbed

- Neo Everyday PDF parsing
- Cursor SDK AI insights (`AiInsightsProvider`, off by default)
