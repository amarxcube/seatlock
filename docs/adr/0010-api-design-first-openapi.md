# ADR-0010: Design-first API with a committed OpenAPI contract

- **Status:** Accepted. The CI contract check (runtime spec + `oasdiff`) is superseded by [ADR-0014](0014-contract-enforcement-by-response-validation.md).
- **Date:** 2026-10-26

## Context

Frontend and backend work will happen in parallel. Both sides need to agree on endpoints, payloads and error formats before implementation, and that agreement must not silently drift.

## Decision

- [`docs/api/openapi.yaml`](../api/openapi.yaml) (OpenAPI 3.1) is the **contract**. API changes start as a PR to this file.
- `packages/api-client` is generated from it (`openapi-typescript` + `openapi-fetch`), so the frontend can't call endpoints that don't exist or send the wrong shapes.
- The backend also emits its own spec at runtime (`/api/docs`, `/api/docs/openapi.json`). A CI step compares it with the committed contract and fails on breaking differences (`oasdiff`).
- Conventions (versioning, errors, pagination, idempotency) are defined in [api.md](../api.md).
- The frontend can develop against a mock server (Prism) running from the contract before endpoints exist.

## Alternatives considered

- **Code-first only (generate the spec from NestJS decorators):** the spec follows whatever the code does, so breaking changes slip through unnoticed.
- **tRPC:** great type safety, but it isn't a public REST contract and doesn't suit the Stripe webhook or third-party clients.
- **GraphQL:** flexible, but adds complexity (caching, N+1 queries, authorization per field) that this domain doesn't need.

## Consequences

- **Positive:** parallel development; breaking changes caught in review and CI; free mock server and typed client.
- **Negative:** the spec must be kept up to date by hand; CI enforces this.
