# ADR-0003: NestJS for the backend

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The backend has many modules (auth, venues, events, holds, payments, tickets, realtime, admin), needs role-based guards, a WebSocket gateway, background workers, and OpenAPI documentation. We want TypeScript end to end (see PRD §16, decision 5).

## Decision

Use **NestJS** (Express adapter) with TypeScript in strict mode. The same application starts in two modes: `main.ts` (HTTP + WebSocket) and `worker.ts` (queue processors, sweeper, outbox relay).

## Alternatives considered

- **Express or Fastify without a framework:** maximum flexibility, but we'd hand-build dependency injection, module boundaries, guards and gateway wiring.
- **FastAPI (Python):** excellent, but it splits the stack across two languages and loses shared types.
- **Hono or tRPC:** lightweight, but less suited to a public REST contract plus WebSockets plus workers in one codebase.

## Consequences

- **Positive:** clear module boundaries; built-in guards, interceptors, pipes and gateways; first-class BullMQ, Socket.IO and Swagger integrations; a widely known industry structure.
- **Negative:** decorator-heavy code and a learning curve. Startup is slower than bare Express (irrelevant for a long-running service).
