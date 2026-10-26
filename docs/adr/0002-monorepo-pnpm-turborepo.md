# ADR-0002: Monorepo with pnpm workspaces and Turborepo

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The frontend and backend are both TypeScript and share a lot: validation schemas, enums (seat status, order status), constants (hold TTL, max seats per hold) and API types. If these live in separate repositories, they drift apart, and a contract change needs coordinated releases.

## Decision

One repository using **pnpm workspaces**, with **Turborepo** for task orchestration and caching.

- `apps/web`, `apps/api`
- `packages/shared`, `packages/api-client`, `packages/eslint-config`, `packages/tsconfig`
- Turborepo pipelines: `lint`, `typecheck`, `test`, `build`, with remote caching in CI.

## Alternatives considered

- **Two repositories:** clean separation, but shared types need publishing and versioning. Overkill for one team.
- **Nx:** more powerful (generators, dependency graph rules), but heavier and more opinionated than we need.
- **npm or yarn workspaces:** pnpm is faster, uses less disk, and its strict dependency layout catches packages that are used but not declared.

## Consequences

- **Positive:** one PR can change the API, the shared schema and the UI together; one CI pipeline; atomic refactors.
- **Negative:** CI must use Turborepo's change detection to stay fast. Docker builds need `turbo prune` to avoid copying the whole repository.
