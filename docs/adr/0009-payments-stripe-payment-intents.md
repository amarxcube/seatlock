# ADR-0009: Stripe PaymentIntents with webhook-driven fulfilment

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Customers pay for held seats while a countdown runs. The PRD makes the platform a single merchant (no Connect), in test mode. Payment confirmation must be reliable even if the customer closes the tab, and duplicate or delayed notifications must not cause double fulfilment.

## Decision

- Use **PaymentIntents** with the **Payment Element** embedded on our own `/checkout/:holdId` page, so the hold countdown stays visible during payment.
- `POST /holds/:id/checkout` creates the `pending` order and a PaymentIntent, passing a Stripe `Idempotency-Key` equal to the order ID. Metadata includes `orderId`, `holdId` and `eventId`. The client's `Idempotency-Key` header makes retries return the same order.
- **Fulfilment happens only in the webhook** (`payment_intent.succeeded`), never from the client redirect. The redirect page polls the order status.
- The webhook verifies the `Stripe-Signature` header against the raw body, inserts the Stripe event ID into `webhook_events` (`ON CONFLICT DO NOTHING`; a duplicate returns 200 immediately), and applies the state change in the same transaction.
- There is at most one live order per hold. Calling checkout again for the same hold returns the existing `pending` order and its client secret.
- Other events handled:
  - `payment_intent.payment_failed` → the attempt is logged, and the order **stays `pending`**. The PaymentIntent goes back to `requires_payment_method`, so the customer can retry with another card while the hold lasts.
  - `payment_intent.canceled` → order `failed`. The sweeper cancels the PaymentIntents of orders whose hold has expired and marks those orders `expired`.
  - `charge.refunded` → order `refunded`.
- **Conflict path:** if the hold's seats can't all be marked sold, the order becomes `failed_conflict` and a refund is issued through the outbox (see [ADR-0007](0007-background-jobs-bullmq-outbox.md)).
- A PaymentIntent is created only if the hold has at least 60 seconds left, to reduce conflicts.

## Alternatives considered

- **Stripe Checkout (hosted page):** less code, but the redirect hides our countdown and seat context, and the integration is less instructive.
- **Fulfil on client confirmation:** unreliable (closed tabs) and spoofable.

## Consequences

- **Positive:** reliable, idempotent fulfilment; correct handling of late payments.
- **Negative:** we must run the Stripe CLI locally to forward webhooks. Out-of-order events require transitions that only move forward (for example, `paid` never goes back to `failed`).
