# ADR-0012: Integer cents for money; UTC plus venue time zone for time

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Floating-point money produces rounding errors (`0.1 + 0.2 ≠ 0.3`). Event times must display in the venue's local time regardless of where the customer is, and must stay correct across daylight-saving changes (PRD §16, decision 4).

## Decision

**Money**
- All amounts are stored and transmitted as **integers in minor units** (`price_cents INTEGER`), with a single currency, USD (`currency` is fixed in config, not stored per row in the MVP).
- Order totals are computed in SQL or integer arithmetic, never with floats.
- `order_items` snapshot the unit price at checkout, so later price changes don't alter past orders.
- Only the frontend converts to a display string, using `Intl.NumberFormat`.

**Time**
- All timestamps are `timestamptz`, and the API sends them as ISO-8601 UTC (`2026-11-14T19:30:00Z`).
- Each venue stores an **IANA time zone** (`America/New_York`), never a fixed offset.
- The organizer UI accepts event times as local venue time and converts to UTC before sending.
- The customer UI formats event times in the **venue's** time zone and labels it (for example, "7:30 PM EST"). Hold countdowns use the server's `expiresAt` minus a measured clock offset.
- Date filters (`date=2026-11-14`) are interpreted in the venue's time zone on the server.

## Alternatives considered

- **`NUMERIC(10,2)` / decimal.js:** correct, but needs decimal handling in JavaScript everywhere for no benefit with a single currency.
- **Storing local time without a zone:** breaks across daylight-saving changes and is ambiguous.

## Consequences

- **Positive:** no rounding bugs; correct times for every viewer.
- **Negative:** developers must remember the `_cents` suffix and conversion helpers. Lint rules and shared formatting helpers reduce mistakes.
