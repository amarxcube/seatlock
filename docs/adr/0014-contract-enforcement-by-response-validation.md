# ADR-0014: Enforce the API contract by validating real responses

- **Status:** Accepted
- **Date:** 2026-10-26
- **Supersedes:** the CI contract-check part of [ADR-0010](0010-api-design-first-openapi.md). The rest of ADR-0010 still stands.

## Context

[ADR-0010](0010-api-design-first-openapi.md) makes `docs/api/openapi.yaml` the contract. To catch drift, the backend would generate its own spec at runtime, and CI would diff the two with `oasdiff`.

For a NestJS app, the generated spec only describes request and response bodies if every endpoint is annotated. The plan relied on `nestjs-zod` to derive those shapes from our zod schemas. However, NestJS 12 (the current major, which the project uses) isn't supported by `nestjs-zod`. Without it, each endpoint would need hand-written Swagger decorators, a third copy of every shape alongside `openapi.yaml` and the zod schemas. Decorators also describe what developers *say* an endpoint returns, not what it actually returns.

## Decision

The contract is enforced by checking the API's **real behaviour** against the committed file:

1. **Response validation in integration tests.** A test helper, `expectContract(res, operationId)`, finds the operation in `openapi.yaml` and fails the test if any of these don't match the contract:
   - the response's status code
   - its content type
   - its body, checked against the JSON Schema with Ajv (OpenAPI 3.1 is JSON Schema 2020-12)

   Every integration test that calls an endpoint uses it.
2. **Route coverage.** A test lists every route the running app serves under `/api/v1` and fails if any isn't defined in `openapi.yaml`. Undocumented endpoints can't ship.
3. **`/api/docs` serves the committed contract** (Swagger UI and `/api/docs/openapi.json`), not a generated one.
4. **Client freshness.** CI regenerates `packages/api-client` from `openapi.yaml` and fails if the committed output differs.

Both checks run in CI as part of the integration tests, against real Postgres and Redis.

## Alternatives considered

- **Keep `oasdiff` and hand-annotate every endpoint with Swagger decorators:** it triples every shape, and the annotations can disagree with what the code returns while CI stays green.
- **Stay on NestJS 11 so `nestjs-zod` can generate the spec:** this starts the project on a superseded major version and only defers a forced upgrade. The generated spec would also still describe declared shapes, not observed ones.

## Consequences

- **Positive:**
  - Tests check what the API actually sends, including error bodies and status codes.
  - There are no annotations to maintain.
  - The docs page always shows the reviewed contract.
- **Negative:**
  - An endpoint is only checked as thoroughly as its tests exercise it. Every new endpoint's tests must call `expectContract` for each response they produce, including error responses. This is a review checklist item.
  - Request-side drift (a field that the contract requires but the API ignores) is caught only if tests send such requests. The zod schemas in `packages/shared` remain the source of truth for input rules ([ADR-0011](0011-shared-validation-zod.md)).
