# Kisan Rin Saathi — Agricultural Loan Eligibility and Application Portal

A prototype portal for applying for agricultural financing through two routes, a **government scheme** or a **bank loan**, and for the officers who review those applications.

> **Demonstration only.** All data is synthetic. Approvals in this portal are not real loan sanctions and nothing is disbursed. The eligibility models were trained on synthetic data and are advisory: an officer always makes the decision. The portal does not quote real interest rates, thresholds or guaranteed benefits. Do not enter real Aadhaar numbers, bank credentials or customer records.

**Live demo:** https://kisan-rin-saathi.vercel.app (Vercel, Sydney region, with Supabase PostgreSQL; uploaded documents are stored in the database with `STORAGE_DRIVER=database`). Sign in with the demo accounts below. Check a deployment with `node scripts/live-smoke.mjs <url>`, which creates one demo application.

## What it does

| Role | Can do |
|---|---|
| Farmer | Register, compare routes, fill a 5-step application with drafts, upload documents, submit, read officer reviews, correct and resubmit, start the other route after a rejection (with prefill consent), give a service centre one-time access |
| Government officer | Work the government queue: start review, run the eligibility model, send a structured review to the farmer, compare revisions, approve / reject / escalate, add internal notes |
| Bank officer | Same, for bank applications only |
| Service-centre operator | Prepare and submit applications for a farmer only after the farmer issues a one-time code and the operator confirms consent |

All status changes go through one state machine with optimistic concurrency (`expectedVersion`), every change is written to the status history and audit log, and farmers are notified of each step. English and Hindi are supported for the main screens (see "Known limitations").

## Demo accounts

All demo accounts use the password **`Demo@1234`**.

| Email | Role | Seeded data |
|---|---|---|
| `farmer@demo.in` | Farmer (Ramesh Patel, Gujarat) | Profile only — start a fresh application |
| `farmer2@demo.in` | Farmer (Sunita Devi, Rajasthan) | One submitted government application, one bank draft |
| `farmer3@demo.in` | Farmer (Harpreet Singh, Punjab) | One assessed bank application, one rejected government application |
| `gov.officer@demo.in` | Government officer | Government queue |
| `bank.officer@demo.in` | Bank officer | Bank queue |
| `operator@demo.in` | Service-centre operator | No access until a farmer issues a code |

## Run locally (verified on Windows, Node 24)

Requirements: Node.js 20 or newer. Python 3.12 is only needed to retrain the models; the exported models are committed in `ml/artifacts`.

```bash
npm install
npm run setup        # creates prisma/dev.db (SQLite), applies migrations, seeds demo data
npm run dev          # http://localhost:3000
```

`npm run db:reset` deletes and re-creates the development database with fresh demo data.

Optional environment variables are listed in `.env.example`. The portal runs with none of them set.

### Production build

```bash
npm run build
npm start
```

## Tests

| Command | What it runs | Last result |
|---|---|---|
| `npm test` | Vitest unit and integration tests (state machine, validation, state normalisation, ML parity, full workflow against a throwaway SQLite DB) | 38 passed |
| `npm run test:ml` | pytest for the Python pipelines | 18 passed |
| `npm run test:e2e` | Playwright journeys 1–6 and 8, responsive layouts at 390/820/1440 px, Hindi, keyboard | 49 passed |
| `npm run test:persistence` | Journey 7: data and uploaded files survive a server restart | 8 checks passed |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript | 0 errors |

The end-to-end tests start their own production server on port 3100 with a separate database (`prisma/e2e.db`), upload folder and build folder (`.next-e2e`), so they never touch development data. Install the browser once with `npx playwright install chromium`. Run `npm run test:e2e` before `npm run test:persistence` (it reuses that build).

## Retraining the models

```bash
python -m venv ml/.venv
ml/.venv/Scripts/pip install -r ml/requirements.txt   # macOS/Linux: ml/.venv/bin/pip
npm run ml:train
```

This regenerates the synthetic data, trains and compares the models, writes reports to `ml/reports/` and exports JSON models to `ml/artifacts/`. See `docs/ML_PIPELINES.md`.

## Docker with PostgreSQL (unverified)

`Dockerfile`, `docker-compose.yml` and a PostgreSQL migration (`prisma/postgres/`) are included, but **Docker and PostgreSQL were not available on the development machine, so this path has not been run.** The PostgreSQL schema validates (`prisma validate`), its migration was generated with `prisma migrate diff`, and the standalone build the image uses was built and smoke-tested locally against SQLite.

```bash
docker compose up --build -d          # app on http://127.0.0.1:3000, applies migrations on start
docker compose run --rm seed          # optional demo data
```

Compose credentials are local demo values. Do not expose this stack publicly.

## Project layout

```
app/(site)/        pages (farmer, officer, operator, compare, eligibility, auth)
app/api/           JSON API (all mutations go through server/domain)
components/        UI (app/ = portal screens, forms/, shell/)
lib/domain/        shared rules: constants, state machine, schemas, field definitions, state normalisation
server/            auth, database, domain services, ML inference, storage
ml/                Python data generation, pipelines, tests, reports, exported models
prisma/            SQLite schema and migrations, seed; postgres/ for PostgreSQL
e2e/               Playwright journeys
tests/             Vitest unit and integration tests
docs/              plan, architecture, workflow, schema, ML, test plan, checklist, bugs, progress, report
```

## Known limitations

- Hindi covers navigation, statuses, the main call-to-action buttons, the route comparison page and the farmer dashboard. Application forms, officer screens and model explanations are English only.
- Sessions are stored in the database. There is no email delivery; notifications are in-app only.
- Uploaded documents are stored on local disk outside public paths. There is no virus scanning.
- The older voice assistant (`/assistant`) needs a Sarvam API key for speech features and is outside the scope of the test suite.

See `docs/PROJECT_REPORT.md` for the full write-up and `docs/BUG_REGISTER.md` for defects found and fixed.
