# ADR-0005: Prisma ORM, with raw SQL on the booking hot path

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Most data access is ordinary CRUD (venues, events, users) where an ORM saves time and gives type safety. The booking path (holds, sweeper, webhook fulfilment) needs exact control over SQL: conditional updates, `FOR UPDATE` ordering, `RETURNING`, and partial indexes.

## Decision

- **Prisma** for the schema, migrations and general queries.
- **`prisma.$queryRaw` / `$executeRaw` with tagged templates** (always parameterized) for the hold, release, sweep and fulfilment queries. These live only in the `holds`, `inventory` and `payments` repositories.
- Features Prisma's schema language can't express (partial unique indexes, `CHECK` constraints) are added by hand-edited SQL in the generated migration files.

## Alternatives considered

- **Drizzle:** closer to SQL with a good type experience, but Prisma's migrations and tooling are more established and widely known.
- **TypeORM:** a weaker type-safety record and more runtime surprises.
- **Knex or Kysely only:** full control, but more boilerplate for plain CRUD.

## Consequences

- **Positive:** fast development for CRUD; SQL we can reason about where it matters.
- **Negative:** raw queries aren't checked against the Prisma schema, so they need integration tests against a real Postgres. Hand-edited migrations must be reviewed carefully.
