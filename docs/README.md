# Docs

Suggested reading order for someone new to the project: PRD → architecture → database → API → wireframes. Read the ADRs when you want to know *why* something was done.

| Document | Status | Description |
|---|---|---|
| [PRD.md](PRD.md) | Approved | Product requirements: scope, user stories, functional and non-functional requirements, milestones |
| [architecture.md](architecture.md) | Approved | Components, repository layout, backend modules, frontend design, critical flows, failure modes, security, deployment |
| [database.md](database.md) | Approved | Full schema (DDL), constraints, the locking strategy for holds/checkout/fulfilment/sweeper, migrations, seed data |
| [api.md](api.md) | Approved | API conventions, error catalog, pagination, idempotency, rate limits, caching, WebSocket contract |
| [api/openapi.yaml](api/openapi.yaml) | Approved | OpenAPI 3.1 contract: the source of truth for every endpoint and payload |
| [wireframes.md](wireframes.md) | Approved | Low-fidelity screens, user flows, unhappy paths, design tokens |
| [adr/](adr/) | 14 accepted | Architecture Decision Records |
| [delivery-plan.md](delivery-plan.md) | Active | Phased build plan with status board, acceptance criteria per phase, review gates and templates |

## Changes to the PRD made during design

| Change | Where decided |
|---|---|
| Venue layout locks on first **publish**, not first sale | [database.md §4.2](database.md#42-venues-and-layouts) |
| Seat map split into a cacheable layout and live statuses | [api.md §7](api.md#7-caching) |
| `/ws/events/:id` becomes one Socket.IO connection with per-event rooms | [ADR-0006](adr/0006-realtime-socketio-redis-adapter.md) |
| Admin "unpublish" is implemented as cancel-with-refunds | [api.md §9](api.md#9-endpoint-overview) |
| Added `order_items` price snapshots, `outbox`, `audit_log`, venue `timezone`, user `status` | [database.md](database.md) |
| Hosting narrowed from "Render/Railway/Fly.io" to Render | [ADR-0013](adr/0013-hosting-on-render.md) |
| Contract enforced by validating real responses instead of diffing a generated spec | [ADR-0014](adr/0014-contract-enforcement-by-response-validation.md) |
| Local object storage is RustFS (S3-compatible); MinIO's image was withdrawn from Docker Hub | [delivery plan change log](delivery-plan.md#5-change-log) |
