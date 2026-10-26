# ADR-0011: zod schemas shared between frontend and backend

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The same rules (password policy, max 10 seats per hold, event date ranges, price limits) apply in UI forms and API inputs. Defining them twice means they will diverge.

## Decision

- Request schemas, enums and constants live in `packages/shared` as **zod** schemas.
- The backend validates every request body, query and parameter with a global `ZodValidationPipe` (`nestjs-zod`). Invalid input returns `400` with a problem+json response listing field errors.
- The frontend uses the same schemas with `react-hook-form` + `@hookform/resolvers/zod`.
- Environment config is also validated with zod at startup.
- Response types come from the OpenAPI-generated client ([ADR-0010](0010-api-design-first-openapi.md)). zod is the source of truth for **input** rules.

## Alternatives considered

- **class-validator (NestJS default):** decorator-based, doesn't run cleanly in the browser, and can't be shared.
- **Separate validation on each side:** the rules drift apart.

## Consequences

- **Positive:** one definition per rule; identical error behaviour on client and server.
- **Negative:** zod schemas and the OpenAPI contract describe the same input shapes twice. Contract tests compare the two.
