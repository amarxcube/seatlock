# SeatLock

Event booking with assigned seating. Customers pick exact seats on a live map, hold them for 10 minutes, pay with Stripe (test mode) and get QR-code tickets. The core guarantee is **no seat is ever sold twice**, even when hundreds of people click the same seat at once.

- **Design docs:** [docs/](docs/README.md): PRD, architecture, database, API contract, wireframes, ADRs
- **Progress:** [docs/delivery-plan.md](docs/delivery-plan.md)

## Prerequisites

| Tool             | Version             | Notes                                                      |
| ---------------- | ------------------- | ---------------------------------------------------------- |
| Node.js          | 24 LTS              | Pinned in `.nvmrc` and the `volta` field of `package.json` |
| pnpm             | 10                  | `corepack enable`, or `volta install pnpm`                 |
| Container engine | Podman 5+ or Docker | Runs Postgres, Redis, Mailpit, RustFS and the Stripe CLI   |

**Windows with Podman:** the Podman machine must be **rootless** (`podman machine set --rootful=false` while stopped), otherwise container ports aren't reachable on `localhost`.

**Behind a TLS-intercepting proxy:** set `NODE_USE_SYSTEM_CA=1` in your user environment so Node trusts the operating system's certificates (needed for Prisma's engine download).

## Getting started

```bash
cp .env.example .env            # then add your Stripe test keys if you have them
pnpm install
docker compose up -d            # or: podman compose up -d
pnpm --filter @seatlock/api db:deploy   # apply database migrations
pnpm dev                        # API + worker + web, with reload on change
```

| What                            | URL                                                                       |
| ------------------------------- | ------------------------------------------------------------------------- |
| Web app                         | http://localhost:5173                                                     |
| API                             | http://localhost:3000/api/v1 (health: `/api/v1/health/ready`)             |
| API docs (the OpenAPI contract) | http://localhost:3000/api/docs                                            |
| Mailpit (caught emails)         | http://localhost:8025                                                     |
| RustFS console (object storage) | http://localhost:9001                                                     |
| Postgres                        | `localhost:5433` (5433 avoids clashing with a locally installed Postgres) |

To forward Stripe webhooks locally once `STRIPE_SECRET_KEY` is in `.env`: `docker compose --profile stripe up -d`.

## Commands

| Command                                  | What it does                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                               | Runs the API, worker and web app in watch mode                                                                      |
| `pnpm build`                             | Builds every package                                                                                                |
| `pnpm lint` / `pnpm typecheck`           | ESLint / TypeScript across the repo                                                                                 |
| `pnpm test`                              | Unit tests                                                                                                          |
| `pnpm test:integration`                  | Integration and contract tests against real Postgres and Redis (Testcontainers; needs the container engine running) |
| `pnpm generate`                          | Regenerates the Prisma client and the typed API client from `docs/api/openapi.yaml`                                 |
| `pnpm format`                            | Formats with Prettier                                                                                               |
| `pnpm --filter @seatlock/api db:migrate` | Creates a new migration from `prisma/schema.prisma` (development)                                                   |
| `pnpm --filter @seatlock/api db:deploy`  | Applies pending migrations                                                                                          |

## Repository layout

```
apps/
  api/            NestJS: src/main.ts (HTTP API) and src/worker.ts (background jobs)
  web/            React SPA (Vite, TanStack Query, Tailwind, React Router)
packages/
  shared/         zod schemas, enums, constants and the error catalog, shared by api and web
  api-client/     Typed client generated from docs/api/openapi.yaml
  eslint-config/  Shared lint rules
  tsconfig/       Shared TypeScript settings
docs/             Design docs, ADRs, OpenAPI contract, delivery plan
```

## How changes are made

Every change goes through a pull request to `main`. CI must be green (lint, type-check, unit, integration and contract tests, Docker build). API changes start in `docs/api/openapi.yaml`. Significant decisions get an ADR in `docs/adr/`. See [CLAUDE.md](CLAUDE.md) for the full conventions.

## Deployment

Staging runs on Render, defined in [render.yaml](render.yaml) ([ADR-0013](docs/adr/0013-hosting-on-render.md)). To create it, use Render's **New → Blueprint** with this repository. Every merge to `main` then deploys automatically. Database migrations run before each API deploy.
