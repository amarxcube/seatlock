# ADR-0007: Background jobs with BullMQ, fed by a transactional outbox

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Several side effects must happen reliably but must not slow down requests: ticket PDF rendering, emails, Stripe refunds after a conflict, and the periodic hold sweep. A naive "commit, then enqueue" can lose the job if the process crashes between the two steps, or if Redis is unavailable (the *dual-write problem*).

## Decision

- **BullMQ** on Redis for queues, retries (exponential backoff, max 8 attempts) and repeatable jobs (the hold sweeper, every 30 s).
- A **transactional outbox**: services insert a row into `outbox (id, type, payload, created_at, dispatched_at)` **in the same transaction** as the business change. A relay in the worker polls undispatched rows (`FOR UPDATE SKIP LOCKED`, batches of 100), adds them to BullMQ using the outbox ID as the BullMQ `jobId`, and marks them dispatched.
- Job handlers are **idempotent**: using the same `jobId` deduplicates in BullMQ, and handlers check current state before acting. For example, the refund handler skips orders already marked `refunded`.
- Jobs that fail permanently go to a dead-letter state; they're visible in the admin panel and alerted on.

## Alternatives considered

- **Enqueue directly after commit:** simplest, but jobs are lost on a crash or Redis outage. That's unacceptable for refunds.
- **pg-boss (queue in Postgres):** removes Redis from the job path, but we already need Redis for Socket.IO, and BullMQ has better tooling.
- **Cloud queues (SQS):** adds vendor lock-in and complicates local development.

## Consequences

- **Positive:** at-least-once delivery that survives crashes; Redis outages delay jobs but never lose them.
- **Negative:** an extra table and relay loop; jobs are delayed by up to the relay's polling interval (1 s); every handler must be idempotent.
