# Product Requirements Document — Event Booking Platform

|                        |                |
| ---------------------- | -------------- |
| **Working name** | SeatLock       |
| **Status**       | Approved v1.0  |
| **Owner**        | Amarnath Vadla |
| **Last updated** | 2026-10-26     |

---

## 1. Overview

SeatLock is a web platform where organizers publish events (movies, concerts, talks) at venues with assigned seating, and customers pick exact seats on an interactive map, hold them briefly, pay, and receive QR-code tickets.

The defining engineering challenge is **correctness under contention**: when hundreds of people click the same seat at the same moment, exactly one of them gets it, nobody is charged for a seat they don't own, and abandoned holds return to the pool automatically.

## 2. Problem statement

- Customers want to choose a specific seat and trust that it's theirs once they've chosen it.
- Organizers need to set up venues and events once, and see sales in real time.
- Naive implementations double-book seats, leave seats stuck in "held" forever, or charge customers for failed bookings.

## 3. Goals and non-goals

### Goals

1. Zero double bookings, guaranteed at the database level, not just in application code.
2. Seat holds that expire automatically (default 10 minutes) and release the seats.
3. Live seat-map updates, so users see seats get taken without refreshing.
4. Reliable payment flow using Stripe (test mode), with idempotent webhook handling.
5. A clean, responsive UI that works on phones.
6. Production-grade engineering practices: tests, migrations, CI, API docs, observability.

### Non-goals (for MVP)

- General-admission or standing-room events (seated only)
- Ticket resale or transfer between users
- Real money: Stripe stays in test mode
- Native mobile apps
- Multiple currencies or tax calculation
- Dynamic pricing

## 4. Users and roles

| Role                               | Description                | Key needs                                                              |
| ---------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| **Guest**                    | Not logged in              | Browse events, view seat maps                                          |
| **Customer**                 | Registered user            | Hold seats, pay, view and download tickets, cancel                     |
| **Organizer**                | Creates and manages events | Create venues and seat layouts, publish events, set prices, view sales |
| **Admin**                    | Platform operator          | Manage users and organizers, see all orders, resolve issues            |
| **Gate staff** *(stretch)* | Works the venue entrance   | Scan QR codes and mark tickets as used                                 |

## 5. Scope

### 5.1 MVP (v1)

- Email/password authentication with roles
- Venue and seat-layout builder (grid-based: sections, rows, seats)
- Event creation with price tiers per section
- Event listing, search and filters (date, city, category)
- Interactive seat map with live availability
- Seat holds with automatic expiry
- Checkout with Stripe Checkout or Payment Intents (test mode)
- Order confirmation email with QR-code tickets
- "My tickets" page
- Organizer dashboard: events, seats sold, revenue
- Admin panel: users, events, orders

### 5.2 v2 (after MVP)

- QR-code scanning check-in app (gate staff)
- Refunds and cancellations with policy windows
- Waitlist for sold-out events
- Promo codes
- OAuth login (Google)
- Analytics charts for organizers

## 6. User stories

### Customer

- **C1.** As a customer, I can browse upcoming events and filter by date, city and category.
- **C2.** As a customer, I can open an event and see a seat map with available, held, sold and selected seats clearly distinguished.
- **C3.** As a customer, I can select up to 10 seats and hold them, and I see a countdown timer for my hold.
- **C4.** As a customer, if someone else takes a seat I'm looking at, the map updates within 2 seconds.
- **C5.** As a customer, if my hold expires before I pay, I'm told clearly and the seats are released.
- **C6.** As a customer, I can pay with a card and receive an email with my tickets.
- **C7.** As a customer, I can see all my upcoming and past tickets, and open a QR code for each.

### Organizer

- **O1.** As an organizer, I can create a venue and design its layout: sections, rows and seats, including gaps and accessible seats.
- **O2.** As an organizer, I can create an event at a venue with a date, description, image and price per section.
- **O3.** As an organizer, I can save an event as a draft and publish it when ready.
- **O4.** As an organizer, I can see live sales for each event: seats sold, seats held, revenue.
- **O5.** As an organizer, I can block specific seats (for production equipment or VIPs) so they can't be sold.

### Admin

- **A1.** As an admin, I can view and search all users, events and orders.
- **A2.** As an admin, I can disable a user or unpublish an event.

## 7. Functional requirements

### 7.1 Authentication and authorization

- Register, login and logout; password reset by email.
- JWT access token (15 min) plus rotating refresh token (7 days) in an httpOnly cookie.
- Role-based access control is enforced on every endpoint; organizers can only modify their own venues and events.

### 7.2 Venues and seat layouts

- A venue has sections; a section has rows; a row has seats.
- Each seat has a label (for example "B-12"), x/y coordinates for rendering, and flags (accessible, blocked).
- Once any event at a venue is published, the layout is locked (it becomes read-only), because the event's seat inventory is generated from it. *(Revised 2026-10-26 during database design; was "once any event has sales".)*

### 7.3 Events

- Fields: title, description, category, venue, start/end time, cover image, status (`draft`, `published`, `cancelled`, `completed`).
- Price tiers are assigned per section.
- Publishing an event creates one `event_seat` row per seat (the event's seat inventory).

### 7.4 Seat holds (core)

- A customer can hold 1–10 seats for one event in a single request.
- **The hold is all-or-nothing:** if any requested seat is unavailable, none are held, and the response lists the seats that conflicted.
- Holds last 10 minutes (configurable). The client shows a countdown.
- A customer can have at most one active hold per event. A new hold replaces the previous one.
- Expired holds are released by:
  1. **lazy reclaim:** an expired hold counts as available when someone else tries to take the seat, and
  2. **a background sweeper job** running every 30 seconds, which keeps the UI and counts accurate.

### 7.5 Checkout and payments

- Checkout is allowed only while the hold is still active.
- An order is created in `pending` status, and a Stripe PaymentIntent is created with an idempotency key.
- The Stripe webhook (`payment_intent.succeeded`) moves the order to `paid` and the seats to `sold`, inside a single transaction.
- Webhooks are idempotent: each Stripe event ID is stored and duplicates are ignored.
- **Edge case:** if payment succeeds after the hold expired and the seat was taken by someone else, the order is marked `failed_conflict` and refunded automatically. This must be logged and alerted on.

### 7.6 Tickets

- One ticket per seat, with a unique ID and a signed QR payload (HMAC), so tickets can't be forged.
- Tickets are emailed as a PDF and viewable in the app.
- Ticket status: `valid`, `used`, `cancelled`.

### 7.7 Real-time updates

- Clients viewing an event subscribe to a WebSocket channel for that event.
- The server broadcasts seat status changes (`held`, `released`, `sold`) to subscribers.
- If the socket disconnects, the client falls back to polling and fetches a full refresh on reconnect.

### 7.8 Notifications

- Emails for order confirmation, event cancellation and password reset.
- Emails are sent from a background job queue with retries; sending is never part of the request path.

## 8. Booking state machines

### Seat (per event)

```
            hold()                 payment succeeded
available ─────────▶ held ───────────────────────▶ sold
    ▲                 │
    └─── expire() / ──┘
         release()

available ──block()──▶ blocked ──unblock()──▶ available
```

### Order

```
pending ──payment ok──▶ paid ──refund──▶ refunded
   │
   ├──payment failed──▶ failed
   ├──hold expired────▶ expired
   └──seat conflict───▶ failed_conflict ──auto refund──▶ refunded
```

## 9. Non-functional requirements

| Area                    | Requirement                                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Correctness**   | No seat sold twice. Enforced by a database constraint and conditional (compare-and-set) updates, and verified by a concurrency test that fires 100+ parallel hold requests at the same seat. |
| **Performance**   | Seat map loads in under 300 ms (p95) for a 2,000-seat venue. Hold requests complete in under 200 ms (p95).                                                                                   |
| **Scalability**   | The API is stateless and can scale horizontally. WebSocket fan-out works across instances through Redis pub/sub.                                                                             |
| **Availability**  | If Redis is down, the system degrades gracefully: booking still works, only live updates are lost.                                                                                           |
| **Security**      | Passwords hashed with argon2. Rate limits on auth and hold endpoints. Input validation on every request. Stripe webhook signatures verified. OWASP Top 10 reviewed.                          |
| **Observability** | Structured JSON logs with request IDs, a `/health` endpoint, and metrics for holds, conflicts, expiries and payments.                                                                      |
| **Accessibility** | The seat map is keyboard navigable and screen-reader labelled; meets WCAG 2.1 AA colour contrast.                                                                                            |
| **Testing**       | Unit and integration tests run against a real Postgres in Docker. At least 80% coverage on the booking module. E2E tests for the happy-path purchase.                                        |

## 10. Data model (initial)

```
users          (id, email, password_hash, name, role, created_at)
venues         (id, organizer_id → users, name, address, city, layout_locked)
sections       (id, venue_id → venues, name, color)
seats          (id, section_id → sections, row_label, seat_number, x, y, is_accessible)
events         (id, organizer_id, venue_id, title, description, category,
                starts_at, ends_at, status, cover_image_url)
price_tiers    (id, event_id, section_id, price_cents)
event_seats    (id, event_id, seat_id, status, hold_id → holds NULL,
                hold_expires_at NULL, order_id NULL, version)
                UNIQUE (event_id, seat_id)
holds          (id, event_id, user_id, expires_at, status)
orders         (id, user_id, event_id, hold_id, status, total_cents,
                stripe_payment_intent_id, created_at)
tickets        (id, order_id, event_seat_id, qr_token, status, checked_in_at)
webhook_events (stripe_event_id PK, type, processed_at)
```

**Atomic hold.** The hold succeeds only if the number of rows updated equals the number of seats requested; otherwise the transaction rolls back.

```sql
UPDATE event_seats
SET status = 'held', hold_id = $1, hold_expires_at = now() + interval '10 minutes'
WHERE event_id = $2
  AND seat_id = ANY($3)
  AND (status = 'available' OR (status = 'held' AND hold_expires_at < now()));
```

## 11. API outline

| Method | Endpoint                                                                 | Role      |
| ------ | ------------------------------------------------------------------------ | --------- |
| POST   | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Public    |
| GET    | `/events?city=&date=&category=&page=`                                  | Public    |
| GET    | `/events/:id`                                                          | Public    |
| GET    | `/events/:id/seats`                                                    | Public    |
| POST   | `/events/:id/holds` `{ seatIds: [] }`                                | Customer  |
| DELETE | `/holds/:id`                                                           | Customer  |
| POST   | `/holds/:id/checkout`                                                  | Customer  |
| POST   | `/webhooks/stripe`                                                     | Stripe    |
| GET    | `/me/orders`, `/me/tickets`                                          | Customer  |
| GET    | `/tickets/:id/qr`                                                      | Customer  |
| CRUD   | `/organizer/venues`, `/organizer/venues/:id/layout`                  | Organizer |
| CRUD   | `/organizer/events`, `POST /organizer/events/:id/publish`            | Organizer |
| GET    | `/organizer/events/:id/stats`                                          | Organizer |
| GET    | `/admin/users`, `/admin/orders`, `/admin/events`                   | Admin     |
| WS     | `/ws/events/:id` (seat status stream)                                  | Public    |

The full contract will be published as OpenAPI at `/docs`.

## 12. Tech stack

| Layer                   | Choice                                                          | Why                                                   |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Frontend                | React, TypeScript, Vite, TanStack Query, Tailwind, React Router | Typed, fast dev loop, good server-state caching       |
| Seat map                | SVG rendering (Konva as fallback if performance requires it)    | Crisp at any zoom, accessible                         |
| Backend                 | Node.js, NestJS, TypeScript                                     | Structured modules, DI, guards; TypeScript end to end |
| Database                | PostgreSQL 16 with Prisma (raw SQL for the hold path)           | Transactions, constraints, row-level locking          |
| Cache / pub-sub / queue | Redis + BullMQ                                                  | WebSocket fan-out, hold sweeper, email jobs           |
| Payments                | Stripe (test mode)                                              | Industry standard; good webhook tooling               |
| Email                   | Nodemailer + Mailpit (dev), Resend or SES (prod)                |                                                       |
| Testing                 | Vitest/Jest, Supertest, Testcontainers, Playwright              |                                                       |
| Infrastructure          | Docker Compose, GitHub Actions, Render/Railway/Fly.io           |                                                       |

## 13. Success metrics

- **0** double bookings in the concurrency test suite and in production logs.
- More than 99% of expired holds released within 60 seconds.
- Checkout success rate (paid orders ÷ checkouts started) tracked on the organizer dashboard.
- p95 latencies meet the targets in section 9.
- CI green on every merge to `main`.

## 14. Milestones

| #  | Milestone            | Deliverables                                                                          |
| -- | -------------------- | ------------------------------------------------------------------------------------- |
| M0 | Project setup        | Monorepo, Docker Compose (Postgres, Redis, Mailpit), CI, lint/format, health endpoint |
| M1 | Auth and users       | Register, login, refresh, roles, guards, tests                                        |
| M2 | Venues and layouts   | Layout builder API and UI, seat-map rendering                                         |
| M3 | Events               | CRUD, publishing, listing, search, inventory generation                               |
| M4 | Holds (core)         | Atomic hold, release, sweeper, concurrency tests, countdown UI                        |
| M5 | Real-time            | WebSocket gateway, Redis pub/sub, live seat map                                       |
| M6 | Payments and tickets | Stripe checkout, webhooks, orders, QR tickets, emails                                 |
| M7 | Dashboards           | Organizer stats, admin panel                                                          |
| M8 | Hardening and deploy | Rate limits, load test (k6), observability, production deploy, README                 |

## 15. Risks and mitigations

| Risk                                 | Mitigation                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Race conditions cause double booking | Conditional updates plus a unique constraint; dedicated concurrency tests in CI |
| Payment succeeds after hold expiry   | Detect in webhook, mark `failed_conflict`, auto-refund, alert                 |
| Duplicate or out-of-order webhooks   | Store processed Stripe event IDs; state transitions only move forward           |
| Large venues render slowly           | SVG virtualization by section; switch to canvas if needed                       |
| Scope creep                          | Hold the line on the non-goals in section 3; move ideas to v2                   |

## 16. Decisions (resolved 2026-10-26)

1. **Hold duration:** one global setting (10 minutes) for MVP; not configurable per event.
2. **Payments:** the platform is a single merchant for MVP; no Stripe Connect payouts to organizers.
3. **Guest checkout:** not supported in MVP; customers must have an account.
4. **Time zones:** times are stored in UTC and displayed in the venue's local time zone.
5. **Backend framework:** NestJS, to keep TypeScript across the stack.
