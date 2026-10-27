# Delivery Plan — SeatLock

| | |
|---|---|
| **Status** | Active |
| **Owner** | Amarnath Vadla |
| **Related** | [PRD milestones](PRD.md#14-milestones) · [Architecture](architecture.md) · [Database](database.md) · [API](api.md) · [Wireframes](wireframes.md) · [ADRs](adr/) |
| **Last updated** | 2026-10-26 |

This plan splits the build into phases. Each phase starts with a plan you approve and ends with a review you sign off. This file is where progress is tracked: update the status board and tick the checklists as work lands.

**Order compared with the PRD milestones:** the booking core (holds) comes before the organizer UI, and staging deploys from Phase 0. Venues and events are seeded by script until the layout builder UI arrives in Phase 6. This puts the riskiest work early, and every review can then happen on a real environment.

---

## 1. Status board

**Status values:** `Not started` · `Planning` · `Plan approved` · `In progress` · `In review` · `Changes requested` · `Done` · `Blocked`

| Phase | Name | PRD | Status | Plan approved | Review signed off | Tag |
|---|---|---|---|---|---|---|
| P | Prerequisites | — | Done | — | 2026-10-26 | — |
| 0 | Foundation and walking skeleton | M0 | In progress | 2026-10-26 | | `phase-0` |
| 1 | Auth and users | M1 | Not started | | | `phase-1` |
| 2 | Venues, events, inventory | M2 (API), M3 | Not started | | | `phase-2` |
| 3a | Holds: backend and concurrency | M4 | Not started | | | `phase-3a` |
| 3b | Holds: seat selection UI | M4 | Not started | | | `phase-3b` |
| 4 | Realtime | M5 | Not started | | | `phase-4` |
| 5 | Payments, orders, tickets | M6 | Not started | | | `phase-5` |
| 6 | Organizer and admin | M2 (UI), M7 | Not started | | | `phase-6` |
| 7 | Hardening and launch | M8 | Not started | | | `phase-7` / `v1.0.0` |

Fill the date columns as `YYYY-MM-DD`.

---

## 2. Phase gate process

Every phase follows the same four steps.

1. **Phase plan (approval required before code).** It covers scope, out of scope, acceptance criteria mapped to PRD story IDs, test plan, migrations and risks. It's written from the [phase plan template](#appendix-a-phase-plan-template) under [Phase notes](#4-phase-notes). Status: `Planning`, then `Plan approved`.
2. **Build.** Work happens on branch `phase/<n>-<name>` as small commits. A phase's tables are created by that phase's own migrations. Any doc or ADR changes go in the same PR. Status: `In progress`.
3. **Automated checks (all must be green).**
   - Lint, type-check, unit tests
   - Integration tests against real Postgres and Redis (Testcontainers)
   - Contract tests: real responses validated against [openapi.yaml](api/openapi.yaml), no undocumented routes ([ADR-0014](adr/0014-contract-enforcement-by-response-validation.md))
   - Coverage thresholds; E2E tests where the phase has a user flow
   - `/code-review` on the diff; also `/security-review` for phases 1, 5 and 7
4. **Review and sign-off.** A phase report is written from the [phase report template](#appendix-b-phase-report-template). You run the demo script locally or on staging and review the PR. Status: `In review`, then `Done` or `Changes requested`. On approval the PR merges to `main` and gets the phase tag.

**Definition of done (every phase)**

- [ ] All acceptance criteria for the phase are ticked
- [ ] CI is green on the PR
- [ ] Staging is deployed from the branch or `main`, and `/health/ready` passes
- [ ] Docs, ADRs and `openapi.yaml` match what was built; any deviations are listed in the report
- [ ] `.env.example` and the README are updated for anything new
- [ ] Phase report written; demo script runs cleanly from a fresh `docker compose up` and seed
- [ ] Signed off by the owner

---

## 3. Phases

### Phase P — Prerequisites

- [x] Initialise git in the project root and create the GitHub repository ([amarxcube/seatlock](https://github.com/amarxcube/seatlock), initial commit `df209f2`)
- [x] Branch protection on `main`: PR required (applies to admins too), no force pushes or deletion, conversations must be resolved. *Required CI status checks are added in Phase 0 once the pipeline exists.*
- [x] Choose the staging host: **Render** ([ADR-0013](adr/0013-hosting-on-render.md))
- [x] Create the Render account and connect it to the GitHub repo (owner; Render GitHub app limited to this repo)
- [x] Create a Stripe test-mode account; install the Stripe CLI (sandbox account; CLI 1.55.1 logged in; `stripe listen` needs an explicit `--events` list)
- [x] Local toolchain: Node 24 and pnpm 10 (via Volta); **Podman** as the container engine (already installed; `podman compose` verified with Postgres 16)
- [x] Add `CLAUDE.md` with project conventions taken from the ADRs: `_cents` money, UTC times, raw SQL only in the `holds`/`inventory`/`payments` repositories, problem+json errors, zod in `packages/shared`

### Phase 0 — Foundation and walking skeleton

**Scope**
- [x] pnpm workspaces and Turborepo: `apps/web`, `apps/api`, `packages/shared`, `packages/api-client`, `packages/eslint-config`, `packages/tsconfig` ([ADR-0002](adr/0002-monorepo-pnpm-turborepo.md))
- [x] `docker-compose.yml`: Postgres 16, Redis 7, Mailpit, RustFS (replaces MinIO), Stripe CLI
- [x] NestJS app with two entry points, `main.ts` (API) and `worker.ts` (worker) ([ADR-0003](adr/0003-nestjs-backend.md))
- [x] Prisma set up with an empty baseline migration
- [x] Config validated by zod at boot; the process exits on invalid config
- [x] pino JSON logging with `X-Request-Id`
- [x] Global problem+json exception filter and global `ZodValidationPipe`
- [x] `/health/live` and `/health/ready` (Postgres required; Redis reported only)
- [x] `/api/docs` serving the committed contract ([ADR-0014](adr/0014-contract-enforcement-by-response-validation.md)); `api-client` generated from `openapi.yaml`
- [x] React + Vite + Tailwind + Router + TanStack Query shell, with design tokens from [wireframes §6](wireframes.md#6-design-tokens)
- [x] GitHub Actions: lint → type-check → test → build → Docker image (`turbo prune`); required status checks on `main`
- [x] Decide on branching before development starts: **stay with feature → `main`** until a second contributor joins (owner, PR #3). Phase tags on `main` mark signed-off states.
- [ ] `render.yaml` Blueprint *(written)* and staging deploy of web, api and worker, with Render Postgres and Key Value ([ADR-0013](adr/0013-hosting-on-render.md)); check whether session affinity is available

**Acceptance criteria**
- [ ] A fresh clone runs with `pnpm i && docker compose up && pnpm dev` and nothing else
- [ ] `/health/ready` returns 200 locally and on staging; it returns 503 when Postgres is stopped
- [x] An unknown route returns a problem+json body containing `requestId`
- [x] The CI pipeline fails on a lint error, a type error or a failing test (demonstrated once: PR #5, run 40331166054)
- [x] The contract tests run in CI

### Phase 1 — Auth and users

PRD §7.1 · [ADR-0008](adr/0008-auth-jwt-rotating-refresh-tokens.md)

**Scope**
- [ ] Migration: `users`, `refresh_tokens`, `password_reset_tokens`, `audit_log` (as in [database.md §4.1](database.md#41-identity))
- [ ] Register, login, refresh, logout, forgot-password and reset-password endpoints
- [ ] argon2id with the settings in ADR-0008
- [ ] Refresh-token rotation with family reuse detection; httpOnly cookie scoped to `/api/v1/auth`
- [ ] `JwtAuthGuard`, `RolesGuard`, `@Roles()`; `users.status` checked on refresh
- [ ] Password-reset email via an outbox row → BullMQ → Mailpit (first use of the [ADR-0007](adr/0007-background-jobs-bullmq-outbox.md) outbox relay)
- [ ] Web: login, register, forgot-password and reset-password pages; in-memory access token; silent refresh with a single-flight lock; role-aware route guards
- [ ] Seed: admin, organizer and customer users

**Acceptance criteria**
- [ ] Reusing a rotated refresh token revokes the whole family (integration test)
- [ ] Login and forgot-password give the same response for unknown and known emails (no user enumeration)
- [ ] A disabled user can't refresh
- [ ] Each role reaches only its own endpoints (guard test matrix)
- [ ] Parallel requests with an expired access token trigger exactly one refresh (web unit test)
- [ ] A reset email arrives in Mailpit and is sent from the worker, not the request path
- [ ] `/security-review` findings resolved or accepted

### Phase 2 — Venues, events, inventory (API first)

PRD §7.2, §7.3, stories C1, C2 (read-only), O1 (API), O2, O3

**Scope**
- [ ] Migration: `venues`, `sections`, `seats`, `events`, `price_tiers`, `event_seats`, including the layout-lock trigger and `UNIQUE (venue_id, x, y)`
- [ ] Organizer venue and layout API (CRUD); edits rejected once the layout is locked
- [ ] Organizer event CRUD, price tiers, publish → generates one `event_seats` row per seat and locks the layout
- [ ] Public listing with filters (date in venue time zone, city, category) and pagination as in [api.md §4](api.md#4-pagination-filtering-sorting)
- [ ] Seat map split into a cacheable layout and live statuses, with ETag ([api.md §7](api.md#7-caching))
- [ ] Cover image upload through presigned URL (RustFS locally)
- [ ] Idempotent seed script: three venues including the 2,000-seat "Arena North", 12 events, every seat state ([database.md §8](database.md#8-seed-data-development-and-staging))
- [ ] Web: event listing with filters (S1); event detail with a **read-only** SVG seat map (S2) that is keyboard focusable and has ARIA labels

**Acceptance criteria**
- [ ] Publishing creates exactly one inventory row per seat; publishing twice has no extra effect
- [ ] A layout edit after publish is rejected by both the service and the DB trigger
- [ ] An organizer can't read or modify another organizer's venues or events (test)
- [ ] Seat-map snapshot p95 < 300 ms for 2,000 seats; a measurement and `EXPLAIN ANALYZE` are attached to the report
- [ ] Snapshot payload ≈ 60 KB gzipped or less for 2,000 seats; `If-None-Match` returns 304
- [ ] Event times display in the venue's time zone with its label; a DST test case passes
- [ ] Money is integer cents end to end and formatted only in the UI

### Phase 3a — Holds: backend and concurrency (the core)

PRD §7.4 · [ADR-0004](adr/0004-seat-hold-concurrency.md) · [database.md §5](database.md#5-concurrency-and-locking)

**Scope**
- [ ] Migration: `holds` table and constraints (`event_seats_state_chk`, `holds_one_active_per_user_event`)
- [ ] `POST /events/:id/holds`: all-or-nothing, at most 10 seats, replaces the caller's previous hold, seats locked with `ORDER BY seat_id FOR UPDATE`, raw parameterised SQL
- [ ] 409 `SEATS_UNAVAILABLE` response that lists the conflicting seats
- [ ] `DELETE /holds/:id` (release); `GET` for the current hold
- [ ] Lazy reclaim of expired holds
- [ ] Sweeper as a BullMQ repeatable job every 30 s
- [ ] Metrics: `holds_created_total`, `hold_conflicts_total`, `holds_expired_total`

**Acceptance criteria**
- [ ] **Concurrency test:** 100+ parallel holds on the same seat give exactly 1 success and the rest 409; runs in CI
- [ ] **Multi-seat overlap test:** parallel holds on overlapping seat sets (for example A,B,C vs C,B,D) produce no deadlocks and never a partial hold
- [ ] **Sweeper-off test:** with the worker stopped, an expired hold's seats can still be held by someone else
- [ ] A new hold replaces the previous one atomically; the old seats are released in the same transaction
- [ ] Blocked and sold seats can never be held
- [ ] With the sweeper on, more than 99% of expired holds are released within 60 s
- [ ] Hold request p95 < 200 ms under the concurrency test (measured)
- [ ] `holds` module coverage ≥ 80%

### Phase 3b — Holds: seat selection UI

Stories C2, C3, C5 · [wireframes S2](wireframes.md#s2--event-detail-and-seat-map-the-core-screen)

**Scope**
- [ ] Seat selection (up to 10) in a Zustand store; seats are `role="checkbox"` buttons
- [ ] Hold action; countdown driven by the server's `expiresAt` with clock-offset correction
- [ ] Unhappy paths: 409 conflict highlight, hold expired on the map
- [ ] Release-hold action

**Acceptance criteria**
- [ ] Every S2 unhappy path in [wireframes §2](wireframes.md#unhappy-paths-that-must-be-designed) is implemented and shown in the demo
- [ ] The seat map is fully usable by keyboard; screen-reader labels read like "Row B seat 12, $45, available"
- [ ] The countdown stays correct when the client clock is skewed by ±2 minutes
- [ ] Component tests for the selection limit, conflict handling and expiry

### Phase 4 — Realtime

PRD §7.7, story C4 · [ADR-0006](adr/0006-realtime-socketio-redis-adapter.md) · [api.md §8](api.md#8-websocket-contract-socketio)

**Scope**
- [ ] Socket.IO gateway on namespace `/realtime`; rooms `event:{id}`; optional access token in `auth.token`
- [ ] `@socket.io/redis-adapter` for fan-out across instances
- [ ] Broadcast only **after commit** from holds, release, sweeper (and later fulfilment)
- [ ] Client: patch the TanStack Query cache by `seatId`, ignore stale `version`, refetch on reconnect, 15 s background refetch, "Live updates paused" pill

**Acceptance criteria**
- [ ] A hold in browser A appears in browser B in under 2 s
- [ ] With two API instances, a change on instance 1 reaches a client on instance 2
- [ ] Out-of-order updates never move a seat backwards (test)
- [ ] **Redis killed:** holds and checkout keep working; live updates degrade as documented
- [ ] Reconnect produces a full snapshot refetch

### Phase 5 — Payments, orders, tickets

PRD §7.5, §7.6, §7.8, stories C6, C7 · [ADR-0007](adr/0007-background-jobs-bullmq-outbox.md) · [ADR-0009](adr/0009-payments-stripe-payment-intents.md)

**Scope**
- [ ] Migration: `orders`, `order_items`, `tickets`, `webhook_events` (`outbox` exists from Phase 1)
- [ ] `POST /holds/:id/checkout` with `Idempotency-Key`; refuses to start if less than 60 s remain on the hold; one live order per hold
- [ ] PaymentIntent with Stripe idempotency key = order ID
- [ ] Webhook: raw-body signature check, event-ID dedup, fulfilment transaction, `failed_conflict` path, `payment_failed` / `canceled` / `charge.refunded` handling
- [ ] Order state machine in one place; transitions only move forward
- [ ] Outbox jobs: ticket PDF + confirmation email, refund + alert, apology email
- [ ] Sweeper cancels PaymentIntents of expired pending orders
- [ ] Tickets: HMAC-signed QR payload with constant-time check; `GET /me/orders`, `/me/tickets`, `/tickets/:id/qr`
- [ ] Web: checkout (S3) with the Payment Element and countdown; confirmation (S4) with polling; My tickets (S5, S6)
- [ ] Playwright E2E test for the happy-path purchase

**Acceptance criteria**
- [ ] Happy path: hold → pay with test card → webhook → order `paid`, seats `sold`, tickets issued, email with PDF in Mailpit
- [ ] Replaying the same webhook (Stripe CLI `events resend`) changes nothing
- [ ] **Late payment conflict:** the hold expires, someone else takes the seat, payment succeeds → `failed_conflict`, refund issued, alert logged, apology email sent
- [ ] An expired hold whose seats nobody took can still be converted on payment
- [ ] Out-of-order webhooks never move an order backwards
- [ ] **Redis down during fulfilment:** outbox rows wait and are relayed after Redis returns; no job is lost
- [ ] A forged or tampered QR code fails verification
- [ ] Every S3 and S4 unhappy path in the wireframes is implemented
- [ ] `/security-review` findings resolved or accepted

### Phase 6 — Organizer and admin

Stories O1 (UI), O2–O5, A1, A2 · [wireframes §4–5](wireframes.md#4-organizer-screens)

**Scope**
- [ ] Organizer dashboard (O1)
- [ ] Venue layout builder UI (O2): sections, rows, seats, gaps, accessible flags; overlap validation
- [ ] Event editor (O3) with price tiers, cover upload, draft and publish
- [ ] Event sales and seat management (O4): sold, held, revenue, checkout success rate; block and unblock seats (live broadcast)
- [ ] Admin: search users, events and orders; disable a user (revokes token families); cancel an event with refunds; dead-letter job view
- [ ] `audit_log` entries for admin and organizer actions

**Acceptance criteria**
- [ ] A venue built in the UI from scratch can be published and booked end to end
- [ ] The builder blocks edits on a locked layout and explains why
- [ ] Stats match direct SQL counts on seeded data
- [ ] Blocked seats can't be held; unblocking returns them to available live
- [ ] Cancelling an event refunds every paid order through the outbox and emails customers
- [ ] Role and ownership isolation test matrix passes for all organizer and admin endpoints

### Phase 7 — Hardening and launch

PRD §9, §13

**Scope**
- [ ] Rate limits from [api.md §6](api.md#6-rate-limits) with Redis storage and in-memory fallback
- [ ] Prometheus `/metrics`; alerts for `failed_conflict`, dead-letter jobs and sweeper lag
- [ ] k6 load tests: an on-sale spike (200 holds/s on one event), seat-map reads with 5,000 viewers
- [ ] Accessibility audit (axe plus a manual keyboard and screen-reader pass); WCAG 2.1 AA contrast
- [ ] OWASP Top 10 review; Dependabot; `pnpm audit` in CI
- [ ] Production environment, manual promotion of a tagged release, backups and PITR confirmed ([database.md §10](database.md#10-backups))
- [ ] Root README: setup, architecture overview, how to run the tests and load tests

**Acceptance criteria**
- [ ] k6 report meets the targets: seat map p95 < 300 ms, hold p95 < 200 ms, 0 double bookings
- [ ] Rate limits return 429 with `RateLimit-*` headers; booking keeps working with Redis down
- [ ] No open critical or high security findings
- [ ] Accessibility audit has no critical issues
- [ ] Production `/health/ready` is green; a smoke purchase in Stripe test mode succeeds
- [ ] Every PRD §13 success metric has a measurement or dashboard

---

## 4. Phase notes

Record each phase's approved plan and final report here, or link to them. Use the templates in the appendices.

| Phase | Plan | Report | Notes |
|---|---|---|---|
| 0 | [phase-0-plan.md](phases/phase-0-plan.md) | | |
| 1 | | | |
| 2 | | | |
| 3a | | | |
| 3b | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |

## 5. Change log

Record changes to scope, order or acceptance criteria made after this plan was approved.

| Date | Phase | Change | Reason | Approved by |
|---|---|---|---|---|
| 2026-10-26 | All | Plan created | — | Amarnath Vadla |
| 2026-10-26 | P, 0 | Staging and production host set to Render | Owner's choice; recorded in ADR-0013 | Amarnath Vadla |
| 2026-10-26 | P, 0 | Local containers run on Podman instead of Docker Desktop; the compose file stays engine-neutral and CI uses Docker | Podman already installed; no Docker Desktop licence needed | Amarnath Vadla |
| 2026-10-26 | 0 | Contract enforced by validating real responses and route coverage, not a generated spec plus `oasdiff` | `nestjs-zod` doesn't support NestJS 12; ADR-0014 | Amarnath Vadla |
| 2026-10-26 | 0 | Local object storage is RustFS instead of MinIO | MinIO's image was removed from Docker Hub | — (dev-only; reported in phase report) |
| 2026-10-26 | 0 | Podman machine switched to rootless; local Postgres published on port 5433 | Rootful Podman ports weren't reachable on Windows `localhost`; 5432 is taken by a host Postgres | Amarnath Vadla |

---

## Appendix A: Phase plan template

```markdown
# Phase <n> plan — <name>

- **Status:** Draft | Approved (YYYY-MM-DD)
- **Branch:** phase/<n>-<name>

## Goal
One or two sentences.

## In scope
- ...

## Out of scope
- ...

## Acceptance criteria
| # | Criterion | PRD / doc ref | How it's verified |
|---|---|---|---|

## Migrations
Tables, constraints and any `-- manual:` SQL.

## Test plan
Unit / integration / E2E / performance: what each covers.

## Risks and open questions
- ...
```

## Appendix B: Phase report template

```markdown
# Phase <n> report — <name>

- **PR:** <link>
- **Staging:** <link>

## What was built
- ...

## Acceptance criteria results
| # | Criterion | Result | Evidence (test name, numbers, screenshot) |
|---|---|---|---|

## Test summary
Counts, coverage, performance numbers.

## Deviations from the docs
What changed, why, and which docs or ADRs were updated.

## Known issues and follow-ups
- ...

## Demo script (≈5 minutes)
1. ...

## Sign-off
- [ ] Approved by owner — date:
```
