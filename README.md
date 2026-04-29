# AW Client Report Portal — V1 Skeleton

Quarterly **SACS** (cashflow) and **TCC** (net-worth) report generator for the
EF Financial Planning / Windbrook Solutions team. Implements the architecture in
`docs/SRS-v1.0` (provided) using **Next.js 14 (App Router) + TypeScript +
Tailwind + shadcn/ui + Prisma + NextAuth v5 + Puppeteer**.

> **Status: V1 skeleton.** Working end-to-end pipeline (create client → enter
> quarterly snapshot → finalize → generate SACS + TCC PDFs → re-download). The
> SACS bubble diagram and TCC circle chart are deliberately approximate
> layouts — pixel-parity with the firm's real templates is deferred until the
> source files (REF-3 / REF-4) are provided. See **Scope** below.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend & API | Next.js 14 App Router, TypeScript (strict, `noUncheckedIndexedAccess`) |
| UI | Tailwind CSS, shadcn/ui primitives (handwritten copies, no runtime dependency) |
| ORM | Prisma 5 |
| Database | SQLite via `file:./prisma/dev.db` (V1 dev) — swap `provider` to `postgresql` for prod, schema is portable (BigInt cents, no native enums) |
| Auth | NextAuth v5 (Auth.js) Credentials provider, bcrypt-hashed passwords, JWT sessions |
| PDF | Puppeteer (headless Chromium) — same SVG components drive on-screen preview AND PDF render so they cannot drift |
| Storage | Local filesystem `./storage/reports/{clientId}/{snapshotId}/{kind}.pdf`, behind a `ReportStorage` interface for future S3 swap |
| Tests | Vitest |

The math engine (`lib/math/{sacs,tcc,money}.ts`) is pure, integer-cents,
deterministic, and 100%-tested (36 cases) — including the SRS-critical
regression that **liabilities are never subtracted from grand total net worth**.

## Running locally

```bash
pnpm install
cp .env.example .env       # keep AUTH_SECRET secret in real use
pnpm prisma migrate dev    # create dev.db
pnpm db:seed               # creates admin@example.com / admin1234 + sample household
pnpm dev                   # http://localhost:3000
```

Sign in: `admin@example.com` / `admin1234`.

If Puppeteer's Chromium isn't installed yet, run:

```bash
npx puppeteer browsers install chrome
```

On a fresh Linux container Chromium also needs:
`libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2`.

## Tests

```bash
pnpm test                  # 36 math tests; ~400 ms
```

Includes the SRS regression (AT-7 / FR-405): `liabilitiesTotalCents` is
returned separately and never affects `grandTotalNetWorthCents`.

## End-to-end verification (what the smoke test runs)

1. `POST /api/auth/callback/credentials` — login, capture session cookie
2. `POST /api/snapshots` — create DRAFT for `Q1 2026`
3. `PATCH /api/snapshots/{id}` — fill in all balances + cashflow + Zillow
4. `POST /api/snapshots/{id}/finalize` — runs SACS + TCC math, renders both
   templates with Puppeteer, stores PDFs, transitions snapshot to FINALIZED
5. `GET /api/reports/{snapshotId}/sacs` and `.../tcc` — stream PDFs back
6. `PATCH /api/snapshots/{id}` again → **409 Conflict** (immutability proven)

A fresh run on this codebase produced two valid 1-page PDFs (~85 KB and ~99 KB)
in 3 seconds total wall-clock. `report.computedTotals` is persisted as JSON so
any historical PDF can be audited per SRS §7.7.

## Project layout

```
app/
  (app)/                 # protected portal pages
    clients/             # list, create, detail, snapshot pages
  api/
    auth/[...nextauth]   # NextAuth handlers
    clients/             # list + create
    snapshots/           # create, patch, finalize
    reports/[id]/[kind]  # streaming PDF download
  login/                 # public sign-in
auth.ts                  # NextAuth Node-side (bcrypt + Prisma)
auth.config.ts           # NextAuth Edge-safe (used by middleware)
middleware.ts            # route guard
lib/
  math/{money,sacs,tcc}.ts   # pure calculation engine (integer cents)
  pdf/render.ts              # singleton Puppeteer browser
  pdf/templates/{sacs,tcc}.tsx
  services/{clients,snapshots,reports}.ts
  storage.ts                 # local filesystem; pluggable
  validators.ts              # Zod schemas (shared client/server)
  audit.ts
  prisma.ts                  # singleton + BigInt JSON patch
components/
  ui/                  # shadcn primitives (button, input, card, etc.)
  charts/{SacsBubble,TccCircle}.tsx   # used in BOTH live preview AND PDF
  snapshot/Editor.tsx                  # live-preview data entry
  portal-shell.tsx
prisma/
  schema.prisma
  seed.ts
tests/
  math.{money,sacs,tcc}.test.ts
storage/                # PDFs (gitignored)
```

## Scope

### Built end-to-end

- All 9 entities from SRS §5 (Client, Person, Account, StaticFinancialProfile,
  QuarterlySnapshot, SnapshotCashflow, SnapshotAccountBalance,
  SnapshotTrustValue, Report, AuditLog)
- NextAuth Credentials login + middleware route guard
- Client wizard (household, persons, static profile, accounts) in one form
- Quarterly snapshot create → live-preview editor → finalize → PDF generation
- SACS + TCC math engine with regression-tested liabilities-never-subtracted
  invariant
- Live SVG preview that drives the same components used in the PDF templates
  (visual parity by construction)
- Puppeteer PDF generation with singleton browser
- Local filesystem storage with streaming download route
- AuditLog write on every state-changing action
- SSN: only `ssnLast4` ever stored
- Snapshot immutability enforced server-side (any PATCH to a finalized
  snapshot's children returns 409)

### Stubbed (works, but minimal)

- SACS bubble diagram and TCC circle chart layouts are visually plausible but
  **not pixel-parity** with the firm's actual templates. The PDFs include a
  watermark `"V1 layout — approximate; pending source-template parity sign-off"`.
  Drop the real source PDFs (REF-3 / REF-4) into the project and we can refine.
- Single role (`staff`); no admin gating beyond auth.
- No "Use last value" pre-fill button on quarterly entry (data is loaded from
  the most recent snapshot for editing existing snapshots, but a per-field
  prior-quarter copy button is V2).

### Deferred (documented, not built)

- Pixel-perfect SACS/TCC parity (needs REF-3/REF-4 source files)
- Magic-link email auth (needs SMTP)
- S3 storage adapter (interface exists at `lib/storage.ts`)
- Postgres production migration (one-line `provider` swap)
- Sentry integration
- Playwright E2E + visual snapshot tests
- Canva export (SRS §13.3 Q1, unconfirmed)
- API integrations: RightCapital / Schwab / Pinnacle / Zillow / Plaid (SRS §15)
- "Regenerate PDFs" admin action (SRS FR-604)
- Background job queue for PDF generation (currently synchronous)

## Critical SRS rules enforced

| SRS rule | Where |
|---|---|
| Liabilities never subtracted from grand total net worth (FR-405, AT-7) | `lib/math/tcc.ts` + `tests/math.tcc.test.ts` |
| Money in BigInt cents end to end | `lib/math/money.ts`, Prisma `BigInt` columns |
| Full SSN never stored | Schema is `ssnLast4` only; validators reject anything but 4 digits |
| Snapshot immutable after finalize | `lib/services/snapshots.ts#assertDraft` called from every mutator |
| Computed totals persisted with each PDF | `Report.computedTotals` JSONB |
| Audit log on every state change | `lib/audit.ts` invoked from each service mutator |
| Same SVG drives live preview and PDF | `components/charts/*` imported by both `SnapshotEditor` and `lib/pdf/templates/*` |

## Notes for the next iteration

- Drop the real SACS/TCC source PDFs into `docs/templates/`. Refining the
  layouts is a focused task once we can compare side-by-side.
- For Postgres, change `prisma/schema.prisma` `datasource.provider` to
  `postgresql`, set `DATABASE_URL`, run `pnpm prisma migrate deploy`. No code
  changes needed (`BigInt` and `String`-based enums port directly).
- The audit log is currently written outside Prisma transactions because
  SQLite serializes connections (a self-deadlock when a second client write
  runs inside an open interactive transaction). On Postgres this constraint
  goes away and the writes can be folded back into the transaction if desired.
