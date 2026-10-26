# Architecture Decision Records

An ADR captures one significant decision: the context, the choice, and its consequences. ADRs are **immutable once accepted**. To change a decision, write a new ADR that supersedes the old one, and update the old one's status to `Superseded by ADR-XXXX`.

Copy [0000-template.md](0000-template.md) to start a new one. Number sequentially.

| # | Decision | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions as ADRs | Accepted |
| [0002](0002-monorepo-pnpm-turborepo.md) | Monorepo with pnpm workspaces and Turborepo | Accepted |
| [0003](0003-nestjs-backend.md) | NestJS for the backend | Accepted |
| [0004](0004-seat-hold-concurrency.md) | Seat holds use Postgres conditional updates, not Redis locks | Accepted |
| [0005](0005-prisma-with-raw-sql-hot-path.md) | Prisma ORM, with raw SQL on the booking hot path | Accepted |
| [0006](0006-realtime-socketio-redis-adapter.md) | Real-time updates with Socket.IO and the Redis adapter | Accepted |
| [0007](0007-background-jobs-bullmq-outbox.md) | Background jobs with BullMQ, fed by a transactional outbox | Accepted |
| [0008](0008-auth-jwt-rotating-refresh-tokens.md) | JWT access tokens with rotating refresh tokens | Accepted |
| [0009](0009-payments-stripe-payment-intents.md) | Stripe PaymentIntents with webhook-driven fulfilment | Accepted |
| [0010](0010-api-design-first-openapi.md) | Design-first API with a committed OpenAPI contract | Accepted (CI check superseded by 0014) |
| [0011](0011-shared-validation-zod.md) | zod schemas shared between frontend and backend | Accepted |
| [0012](0012-money-and-time-conventions.md) | Integer cents for money; UTC plus venue time zone for time | Accepted |
| [0013](0013-hosting-on-render.md) | Host staging and production on Render, defined as a Blueprint | Accepted |
| [0014](0014-contract-enforcement-by-response-validation.md) | Enforce the API contract by validating real responses | Accepted |
