# Phase 0 plan — Foundation and walking skeleton

- **Status:** Approved 2026-10-26 (PR #3)
- **Branch:** `phase/0-foundation`
- **Delivery plan:** [Phase 0](../delivery-plan.md#phase-0--foundation-and-walking-skeleton)

## Goal

Every later phase starts from a working base:
- the monorepo builds
- the local stack starts with one command
- the API, worker and web app deploy to Render staging
- every PR is gated by CI

No business features or domain tables are built in this phase.

## In scope

### Toolchain
- Node 24 LTS and pnpm 10, pinned in `package.json` (`engines`, `packageManager`, `volta`) and `.nvmrc`. Library versions use the current stable release at phase start and are pinned by the lockfile.
- Turborepo tasks: `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`.
- Shared TypeScript config (`strict`, `noUncheckedIndexedAccess`) in `packages/tsconfig`. ESLint flat config with typescript-eslint, plus Prettier, in `packages/eslint-config`.
- Vitest is the test runner everywhere: the API (with SWC for decorators), the web app and the packages.

### `packages/shared`
- Constants: `HOLD_TTL_SECONDS = 600`, `MAX_SEATS_PER_HOLD = 10`, `CURRENCY = 'USD'`.
- Enums mirrored from [database.md §3](../database.md#3-enum-types) (role, seat status, order status…) as zod enums.
- The problem+json error `code` union from the [error catalog](../api.md#error-catalog).

### `packages/api-client`
- Generated from [openapi.yaml](../api/openapi.yaml) with `openapi-typescript`, used through `openapi-fetch`.
- A `generate` script. CI fails if the generated output isn't committed or is out of date.

### `apps/api` (NestJS 11, Express adapter)
- Two entry points:
  - `main.ts`: HTTP API under `/api/v1`. Swagger UI at `/api/docs`, JSON spec at `/api/docs/openapi.json`.
  - `worker.ts`: connects to Postgres and Redis, and registers a BullMQ `system` queue with a repeatable **heartbeat** job (every 60 s, logs only). This proves the queue path works end to end before real jobs arrive.
- Config module: `.env` validated by zod at boot; the process exits with a readable error if any variable is missing or invalid.
- Logging: `nestjs-pino` JSON logs. `X-Request-Id` is accepted or generated, echoed in the response header, and added to every log line.
- A global exception filter that returns RFC 9457 problem+json with `code` and `requestId`. Phase 0 codes: `NOT_FOUND`, `VALIDATION_FAILED`, `INTERNAL`.
- A global zod validation pipe (`nestjs-zod`).
- Health endpoints, matching the contract:
  - `GET /health/live`: always 200.
  - `GET /health/ready`: 200 when Postgres answers `SELECT 1`, otherwise 503. Redis status is reported but doesn't make the response fail ([architecture §5.1](../architecture.md#51-modules)).
- Security baseline: Helmet, and CORS allowing only `WEB_ORIGIN`.
- Prisma set up with a **baseline migration** containing only:
  - `CREATE EXTENSION citext`
  - the shared `set_updated_at()` trigger function ([database.md §1](../database.md#1-conventions))

  No tables yet.
- UUIDv7 helper in place for later phases.
- One multi-stage `Dockerfile` using `turbo prune`, running as a non-root user. The same image runs the API and the worker.

### `apps/web` (React + Vite + TypeScript)
- Tailwind with the seat-state and timer **design tokens** from [wireframes §6](../wireframes.md#6-design-tokens), in light and dark themes.
- React Router with lazy routes, and a TanStack Query provider.
- One placeholder page that calls `/health/ready` through `api-client` and shows the API status. This proves the web → API → DB path, CORS and the generated client.
- Vitest and Testing Library set up, with one component test.

### Local environment (`docker-compose.yml`, works with Podman or Docker)
- Postgres 16, Redis 7, Mailpit, MinIO (with a `covers` bucket created on start) and the Stripe CLI. The Stripe CLI forwards the four [ADR-0009](../adr/0009-payments-stripe-payment-intents.md) events to `localhost:3000/api/v1/webhooks/stripe`.
- Every service has a health check.
- Only dependencies run in containers. The API, worker and web app run on the host with `pnpm dev`, which gives faster reloads.
- `.env.example` documents every variable. Your real `.env` holds the Stripe test keys and is git-ignored.

### CI (GitHub Actions, on every PR and on `main`)
- Steps: install (pnpm cache) → lint → type-check → unit tests → integration tests (Testcontainers on the runner's Docker) → build → Docker image build.
- `api-client` up-to-date check.
- **Contract check:** `oasdiff` compares the runtime spec with the committed `openapi.yaml`, **for endpoints that exist in code**. Missing endpoints aren't errors while phases are still being built; breaking differences on implemented endpoints fail the build.
- `prisma migrate deploy` against a fresh Postgres.
- After CI runs green once, its checks are added as **required status checks** on `main`.

### Render staging ([ADR-0013](../adr/0013-hosting-on-render.md))
- `render.yaml` Blueprint:
  - static site `seatlock-web`, with SPA rewrite
  - web service `seatlock-api` (Docker; health check `/api/v1/health/ready`; pre-deploy `prisma migrate deploy`)
  - background worker `seatlock-worker` (same image, worker command)
  - Postgres 16
  - Key Value
  - an environment group for secrets (`sync: false`, values entered in the dashboard)
- Staging auto-deploys from `main`.
- Check whether Render supports session affinity, and record the answer in ADR-0013's consequences (as a follow-up note) and in the phase report.

### Docs
- Root `README.md`: prerequisites, setup, commands, project layout.
- Fill in the `Commands` section of `CLAUDE.md`.
- Update the delivery plan checklists.

## Out of scope

- Any domain tables, endpoints or screens: auth, venues, events and the rest start in Phase 1.
- Production environment and release-tag deploys (Phase 7).
- Prometheus `/metrics`, rate limiting, Dependabot (Phase 7).
- Outbox table and relay (Phase 1, with its first real use).
- Playwright E2E setup (Phase 5, with the first purchase flow).

## Acceptance criteria

| # | Criterion | Ref | How it's verified |
|---|---|---|---|
| 1 | From a fresh clone, `pnpm i`, `docker compose up -d` and `pnpm dev` start API, worker and web with no other steps (apart from creating `.env` from `.env.example`) | Delivery plan P0 | Demo script on a fresh clone |
| 2 | `GET /api/v1/health/ready` returns 200 locally and on staging; it returns 503 with a `Health` body showing Postgres down when Postgres is stopped | openapi `readiness` | Integration test (Testcontainers, stop container) + manual on staging |
| 3 | `GET /api/v1/health/ready` stays 200 with `redis: down` reported when Redis is stopped | Architecture §5.1, §8 | Integration test |
| 4 | An unknown route returns `404` `application/problem+json` with `code: NOT_FOUND` and a `requestId` matching the `X-Request-Id` header | api.md §1, §3 | Integration test |
| 5 | The API refuses to start with a clear message when a required env var is missing | ADR-0011 | Unit test of the config schema + manual demo |
| 6 | Each log line is JSON and includes the request ID | Architecture §5.3 | Manual check in the demo |
| 7 | The worker's heartbeat job runs every 60 s locally and on staging | ADR-0007 | Logs |
| 8 | The web placeholder shows "API: ready" via the generated client, locally and on staging (proves CORS) | ADR-0010 | Manual check |
| 9 | CI fails on a lint error, a type error and a failing test (shown once on a throwaway PR), and passes on the phase PR | Delivery plan P0 | Linked CI runs |
| 10 | CI fails when `api-client` is out of date or an implemented endpoint breaks the contract | ADR-0010 | Linked CI run |
| 11 | Baseline migration applies to a fresh database in CI and on staging via pre-deploy | database.md §7 | CI log + Render deploy log |
| 12 | Required status checks are enabled on `main` | Delivery plan P | GitHub branch-protection settings |
| 13 | Staging: web, api and worker are all live from `render.yaml`; no secret appears in the repo | ADR-0013 | Render dashboard + `git grep` for key prefixes |

## Migrations

`0000_baseline`:
- `CREATE EXTENSION IF NOT EXISTS citext;`
- `set_updated_at()` trigger function, marked `-- manual:`

No tables.

## Test plan

| Level | Covers |
|---|---|
| Unit | Config schema, problem+json mapping, request-ID middleware, shared constants and enums |
| Integration (Testcontainers: Postgres 16, Redis 7) | Health ready/degraded/down, 404 problem+json, request-ID echo, migration applies cleanly |
| Component (web) | Status page renders ready / down states from a mocked client |
| Manual | Demo script on a fresh clone and on staging |

## Demo script (for the phase review, ≈5 minutes)

1. Fresh clone → copy `.env.example` → `pnpm i` → `docker compose up -d` → `pnpm dev`.
2. Open the web app: the status page shows "API: ready". Open `/api/docs`.
3. `curl -i localhost:3000/api/v1/nope -H "X-Request-Id: demo-1"`: the response is problem+json with `requestId: demo-1`, and the log line carries the same ID.
4. `docker compose stop postgres`: `/health/ready` returns 503. Start Postgres again and it returns 200. Stop Redis: still 200 with `redis: down`.
5. Show the worker heartbeat logs.
6. Open the staging URLs: web shows "API: ready". Show the CI runs and the required checks on `main`.

## Risks and open questions

| # | Item | Plan |
|---|---|---|
| 1 | **Branching (decision for owner):** keep feature → `main`, or add `develop` now that development starts? | Recommendation: stay with feature → `main` until a second contributor joins; phase tags on `main` already mark signed-off states. Please confirm on this PR. |
| 2 | Render cost starts in this phase (API, worker and Postgres on paid entry plans) | The owner adds a payment method before the staging deploy step. Current prices are checked at render.com/pricing. |
| 3 | Testcontainers with Podman locally (Ryuk reaper with rootless Podman) | Use Podman's Docker-compatible socket. If Ryuk fails, set `TESTCONTAINERS_RYUK_DISABLED=true` locally. CI uses Docker and is unaffected. |
| 4 | The Podman machine has 2 GiB memory; the full stack plus Testcontainers may be tight | Recommend `podman machine stop; podman machine set --memory 4096; podman machine start` if tests get OOM-killed |
| 5 | Render session affinity unknown | Check it during this phase; if it's missing, the Socket.IO client uses WebSocket-only transport in Phase 4 (ADR-0006 allows this) |
| 6 | The contract check must tolerate endpoints not built yet | Compare only paths present in the runtime spec; tested in criterion 10 |
| 7 | The Stripe CLI container needs `STRIPE_API_KEY` | Comes from the local `.env` (`sk_test_…`). The container is optional: `docker compose up` works without it via a compose profile. |
