# ADR-0013: Host staging and production on Render, defined as a Blueprint

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The architecture ([§10](../architecture.md#10-environments-and-deployment)) needs, per environment: a static SPA, an API service (HTTP + WebSocket), a worker service started from the same Docker image, PostgreSQL 16, Redis, migrations run before each deploy, and a health check that gates traffic. Staging auto-deploys from `main`; production is a manual promotion of a tagged release. The PRD left the host open (Render, Railway or Fly.io). Staging must exist from Phase 0 so every phase review can happen on a real environment ([delivery plan](../delivery-plan.md)).

## Decision

Use **Render** for staging and production, with the whole environment defined in a committed **`render.yaml` Blueprint** (written in Phase 0, reviewed in PRs like code).

| Component | Render resource |
|---|---|
| `apps/web` | Static site (SPA rewrite to `index.html`) |
| `apps/api` (`main.ts`) | Web service from the repo's Dockerfile; health check `/health/ready` |
| `apps/api` (`worker.ts`) | Background worker from the same image, different start command |
| PostgreSQL 16 | Render Postgres |
| Redis | Render Key Value |
| Migrations | `prisma migrate deploy` as the API service's pre-deploy command |

- **Staging** auto-deploys when `main` changes. **Production** deploys are triggered from CI on a release tag (deploy hook), never by a push.
- Instance plans:
  - Staging uses paid entry-level instances for the API, worker and Postgres. Free web services sleep after 15 minutes idle, which breaks WebSockets and the sweeper, and free Postgres expires after 30 days. There is no free worker.
  - Key Value can use the free tier in staging.
  - Production Key Value uses a plan with persistence, because queued BullMQ jobs that were already relayed from the outbox would otherwise be lost on restart.
- Secrets (Stripe keys, JWT and QR secrets) are set as Render environment variables or an environment group, never in `render.yaml`.
- **To verify in Phase 0:** whether Render offers session affinity across API instances. If it doesn't, the Socket.IO client uses the WebSocket transport only, as [ADR-0006](0006-realtime-socketio-redis-adapter.md) allows.

Current prices must be checked at [render.com/pricing](https://render.com/pricing) when the services are created.

## Alternatives considered

- **Railway:** a comparable developer experience, but usage-based pricing makes the monthly cost harder to predict, and its config-as-code is less complete for a multi-service environment.
- **Fly.io:** more control (regions, machines), but more operational work (networking, Postgres management) than an MVP needs.
- **AWS / GCP directly:** maximum flexibility, but far too much infrastructure work for this project's goals.

## Consequences

- **Positive:** one reviewed file describes the whole environment; staging and production have the same shape; Docker keeps the application portable, so only `render.yaml` is Render-specific.
- **Negative:** a monthly cost from Phase 0 onward, because free instances don't fit a WebSocket API and a worker. Moving hosts later means rewriting `render.yaml` and the deploy hooks. Render's Postgres and Key Value plan limits (connections, memory) must be checked against the Phase 7 load-test targets.
