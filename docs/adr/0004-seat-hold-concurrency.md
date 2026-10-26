# ADR-0004: Seat holds use Postgres conditional updates, not Redis locks

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

At an on-sale spike, many customers request the same seats at the same moment. The PRD requires **zero double bookings**, all-or-nothing multi-seat holds, and automatic expiry. Whatever decides seat ownership must be correct under concurrency, survive process crashes, and stay consistent with orders and tickets.

## Decision

Postgres is the single arbiter of seat ownership.

1. **Atomic compare-and-set.** A hold is one transaction containing a conditional `UPDATE event_seats ... WHERE status = 'available' OR (status = 'held' AND hold_expires_at < now())`. If the number of updated rows isn't equal to the number of requested seats, the transaction rolls back. Postgres row locks serialize competing updates on the same rows; the loser re-evaluates the `WHERE` clause after the winner commits and matches zero rows.
2. **Deadlock avoidance.** Seat rows are locked in a deterministic order (`ORDER BY seat_id ... FOR UPDATE` in a CTE), so two overlapping multi-seat holds can't deadlock.
3. **Constraints as a safety net:**
   - `UNIQUE (event_id, seat_id)` on `event_seats`
   - a `CHECK` that ties `status` to the `hold_id`/`order_id` columns
   - a partial unique index: at most one non-cancelled ticket per `event_seat`
   - a partial unique index: at most one active hold per (user, event)
4. **Expiry is computed, not scheduled.** An expired hold is treated as available at write time (lazy reclaim). The sweeper only tidies up, so correctness never depends on a background job.
5. Isolation level stays **READ COMMITTED**. The conditional update is sufficient, and SERIALIZABLE would add retry overhead under contention.

The full SQL is in [database.md §5](../database.md#5-concurrency-and-locking).

## Alternatives considered

- **Redis locks (SETNX / Redlock):** fast, but a second source of truth that can disagree with Postgres; Redlock's correctness under failover is disputed; an outage would stop sales.
- **Application-level check-then-insert:** a classic race condition (time-of-check vs time-of-use).
- **SERIALIZABLE isolation:** correct, but causes frequent serialization failures and retries at exactly the moment load is highest.
- **Optimistic version check per seat (`WHERE version = $v`):** works, but needs the client to send versions and generates more conflicts. The conditional status check is simpler and equally safe.
- **Message queue serializing all holds per event:** correct, but adds latency, infrastructure and a single bottleneck per hot event.

## Consequences

- **Positive:** correctness comes from the database; it's simple to reason about and testable with parallel requests; Redis can fail without double bookings.
- **Negative:** hot events put write contention on a few rows. This is acceptable at our scale (about 200 holds/s), and would be revisited with per-event queues if needed.
- **Required:** a concurrency test suite that fires 100+ parallel hold requests at the same seats in CI and asserts exactly one success.
