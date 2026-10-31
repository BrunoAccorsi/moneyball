# Moneyball

Self-hosted ledger for one household. Upload bank and card exports, drop duplicates and your own transfers, categorize with saved rules, and read a month: income, spending, one-offs, and a savings target. Currency is CAD.

The October 2026 CSVs in `fixtures/october/` are the acceptance sample. Neo Everyday and Pai statements are PDF-only and are not parsed yet.

## What an upload does

1. Detect the source from the file headers. Parsers live in `src/domain/parsers/` and the PDF service.
2. Normalize every row to a date, description, signed amount (negative means money out), and account.
3. Skip a file that was already imported, and skip transactions that overlap an earlier export.
4. Pair credit-card payments with the card-side credit so the purchase is counted once. E-transfers to Bruno Accorsi Bergoli, Pai moves, and auto-refills are excluded. Wise Canada is spending (Brazil debt), not a transfer, unless you flag that row.
5. Apply rules. Built-in rules include the October 2026 answers from `fixtures/october/rules.md`. A merchant rule you save later beats the generic defaults. Amount-and-date answers (the stroller, the guitar, Bruna's WestJet share) stay ahead of a broad merchant rule.
6. Mark subscriptions and monthly repeats as recurring. Mark the saved one-time rows, and any later row you toggle.
7. Delete the upload. CSV bytes stay in memory only. The PDF service writes a temp file and removes it after pdfplumber reads it. Nothing raw is stored.

An optional model categorizes leftovers only when `CATEGORIZATION_LLM_API_KEY` is set. With no key, unknowns stay in the review queue.

## Accounts in the October files

| File | Source |
| --- | --- |
| `neo-credit-main.csv` | Neo credit card. Headers `Transaction Date, Posted Date, Status, Description, Amount`. WestJet, groceries, the stroller. |
| `neo-credit-secondary.csv` | The other Neo credit card (Enmax, Disney Plus, Kindle, Audible). Same headers, no card number. A file is this card only when every purchase is one of those merchants. |
| `scotia-chequing.csv` | Scotiabank chequing. Has a `Balance` column and the filter preamble. Wise Canada and the card-bill payment. |
| `scotia-card-8024.csv` | Scotiabank card ending 8024 (`Associated card number`). Purchases are positive debits in the export; the app flips the sign. |

## Local, with Docker

```bash
cp .env.example .env
# set AUTH_PASSWORD and SESSION_SECRET
docker compose up --build
```

Open http://localhost:3000. The database password in the example is for local use; change `POSTGRES_PASSWORD` before this stack is reachable from anywhere else.

`docker compose up` does not need a Traefik network. Port 3000 is published on the web container.

## Local, without Docker

```bash
npm install
python3 -m pip install -r pdf-service/requirements.txt -r pdf-service/requirements-dev.txt
createdb moneyball   # or any local Postgres
cp .env.example .env
```

Set `DATABASE_URL` to that database (for example `postgres://localhost:5432/moneyball`). Then:

```bash
# terminal 1
cd pdf-service && uvicorn app:app --port 8000
# terminal 2
npm run dev
```

Set `PDF_SERVICE_URL=http://127.0.0.1:8000` if it is not already. Tables are created on the first request.

## Tests

```bash
npm test
npm run validate:october
npm run test:pdf
```

`npm run validate:october` loads the four October CSVs and the saved answers and prints computed totals against the manual reference.

## Dokploy

Deploy this compose file on the VPS. Set the environment in Dokploy, not in the image:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Set by compose from the Postgres settings. Override only if the database is elsewhere. |
| `POSTGRES_PASSWORD` | Database password. Change it. |
| `AUTH_PASSWORD` or `AUTH_PASSWORD_HASH` | Login. The hash is bcrypt. Generate one with `node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'password'`. If the hash is set, the plain password is ignored. |
| `SESSION_SECRET` | Signs the session cookie. Use a long random string. |
| `PDF_SERVICE_URL` | `http://pdf:8000` inside compose. |
| `CATEGORIZATION_LLM_API_KEY` | Leave empty to keep the model off. |
| `APP_DOMAIN` | Hostname Traefik should route. Nothing is hardcoded. |
| `TRAEFIK_ENABLE` | `true` to turn on the labels below. Leave `false` if Dokploy creates the router from the domain in its UI. |
| `TRAEFIK_ENTRYPOINTS` | Default `websecure`. |
| `TRAEFIK_CERTRESOLVER` | Default `letsencrypt`. |
| `TRAEFIK_NETWORK` | Default `dokploy-network`, used only with the override file. |

Labels on the web service, all driven by those variables:

```yaml
traefik.enable=${TRAEFIK_ENABLE:-false}
traefik.http.routers.moneyball.rule=Host(`${APP_DOMAIN:-moneyball.localhost}`)
traefik.http.routers.moneyball.entrypoints=${TRAEFIK_ENTRYPOINTS:-websecure}
traefik.http.routers.moneyball.tls=true
traefik.http.routers.moneyball.tls.certresolver=${TRAEFIK_CERTRESOLVER:-letsencrypt}
traefik.http.services.moneyball.loadbalancer.server.port=3000
```

The cookie is `Secure` when `X-Forwarded-Proto` is `https`, which Traefik sends. Local HTTP still gets a normal cookie.

If you need the container attached to the proxy network from compose itself:

```bash
docker compose -f docker-compose.yml -f docker-compose.dokploy.yml up -d
```

Dokploy usually attaches that network once you set a domain, so the override is optional.

## PDF parser

`pdf-service/parsers/neo_everyday.py` and `pai.py` detect a statement and return no transactions. They do not guess a layout. `implemented` is false, and the app will not keep the file hash, so the same PDF can be imported again after the parser is filled in.

When a sample arrives: put it in `pdf-service/fixtures/`, implement `parse()`, and lock the rows in `pdf-service/tests/test_neo_parser.py`.

## October reference

The manual October 2026 analysis is income $5,016.67, spending $7,072.51, one-time $2,589.00, normal spending $4,483.51, net without one-offs +$533.16, rent $1,950.

From the four CSVs and the saved answers the app gets one-time **$2,589.00** exactly, spending **$4,878.79**, income **$0.00**, rent **$0.00**. The gap is the PDF accounts. `npm run validate:october` prints which reference lines are missing.
