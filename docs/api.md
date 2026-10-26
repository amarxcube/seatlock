# API Design — SeatLock

| | |
|---|---|
| **Status** | Approved v1.0 |
| **Contract** | [api/openapi.yaml](api/openapi.yaml) (OpenAPI 3.1): the source of truth for endpoints and payloads |
| **Related** | [ADR-0010 design-first API](adr/0010-api-design-first-openapi.md) · [Architecture](architecture.md) · [Database](database.md) |
| **Last updated** | 2026-10-26 |

This document covers the **conventions** every endpoint follows, the error catalog, and the WebSocket contract, which OpenAPI can't describe. For individual endpoints, read the OpenAPI file, or view it rendered at `/api/docs` once the API is running.

---

## 1. Basics

| Topic | Convention |
|---|---|
| Base URL | `https://api.<domain>/api/v1` (local: `http://localhost:3000/api/v1`) |
| Versioning | URL major version (`/v1`). Additive changes (new endpoints, new optional fields) don't bump the version. Breaking changes need `/v2` and a deprecation window. |
| Format | JSON, UTF-8. Request bodies are `application/json`; errors are `application/problem+json`. |
| Field naming | `camelCase` |
| IDs | UUID strings |
| Timestamps | ISO-8601 in UTC with `Z` (`2026-11-14T19:30:00Z`). Venues include their IANA `timezone` for display. |
| Money | Integer cents, with a `Cents` suffix (`priceCents: 4500` = $45.00). Currency is always USD in v1. |
| Enums | Lowercase snake_case strings (`failed_conflict`). Clients must tolerate unknown values. |
| Nulls | Optional fields that have no value are returned as `null`, not omitted |
| Request tracing | Clients may send `X-Request-Id`. The server echoes it, or generates one, in the response header and in every error body. |

## 2. Authentication

- **Access token:** `Authorization: Bearer <jwt>`, valid for 15 minutes. It's returned in the body of `/auth/login`, `/auth/register` and `/auth/refresh`.
- **Refresh token:** set by the server as the `sl_refresh` cookie (`HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`). The SPA never reads it.
- **Silent refresh:** on `401` with `code: TOKEN_EXPIRED`, the client calls `POST /auth/refresh` once (single-flight), then retries the original request.
- **Roles:** `customer`, `organizer`, `admin`. Each endpoint's required role is listed in the OpenAPI `x-roles` extension. A request with the wrong role gets `403`. A request for **another user's resource** gets `404`, not `403`, so the API doesn't reveal that the resource exists.

See [ADR-0008](adr/0008-auth-jwt-rotating-refresh-tokens.md).

## 3. Errors (RFC 9457 Problem Details)

Every non-2xx response has this shape:

```json
{
  "type": "https://seatlock.dev/problems/seats-unavailable",
  "title": "Some seats are no longer available",
  "status": 409,
  "code": "SEATS_UNAVAILABLE",
  "detail": "2 of the 3 requested seats were taken by another customer.",
  "instance": "/api/v1/events/0193.../holds",
  "requestId": "req_01J...",
  "conflicts": ["0193...a1", "0193...a2"]
}
```

Clients branch on **`code`**, never on `title` or `detail` (those may be reworded). Extra fields depend on the code: `errors` for validation failures, `conflicts` for seat conflicts.

### Error catalog

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body, query or parameters fail schema validation. Includes `errors: [{ path, message }]`. |
| 401 | `UNAUTHENTICATED` | No token, or the token is invalid |
| 401 | `TOKEN_EXPIRED` | Access token expired; refresh and retry |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (deliberately vague) |
| 401 | `REFRESH_INVALID` | Refresh token missing, expired, revoked or reused |
| 403 | `FORBIDDEN` | Authenticated, but the role isn't allowed |
| 403 | `ACCOUNT_DISABLED` | The user has been disabled by an admin |
| 404 | `NOT_FOUND` | The resource doesn't exist, or isn't visible to the caller |
| 409 | `EMAIL_TAKEN` | Registration with an email that's already in use |
| 409 | `EVENT_NOT_ON_SALE` | The event isn't published, or has already started |
| 409 | `SEATS_UNAVAILABLE` | A hold failed because some seats are taken. Includes `conflicts: seatId[]`. |
| 409 | `HOLD_NOT_ACTIVE` | Checkout or release of a hold that's expired, released or converted |
| 409 | `HOLD_EXPIRING` | Checkout attempted with less than 60 s left on the hold |
| 409 | `LAYOUT_LOCKED` | Editing a venue layout after an event there has been published |
| 409 | `INVALID_STATE_TRANSITION` | For example, publishing a cancelled event or blocking a sold seat |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Same `Idempotency-Key` sent with a different request body |
| 422 | `UNKNOWN_SEATS` | Hold request contains seat IDs that don't belong to the event |
| 422 | `EVENT_NOT_PUBLISHABLE` | Publish attempted with missing price tiers, no seats, or a start time in the past |
| 429 | `RATE_LIMITED` | Too many requests. Includes a `Retry-After` header. |
| 500 | `INTERNAL` | Unexpected error. The `requestId` lets support find the logs. |
| 503 | `SERVICE_UNAVAILABLE` | A dependency (such as Stripe) is temporarily failing; retry with backoff |

## 4. Pagination, filtering, sorting

**Cursor pagination** applies to customer-facing and unbounded lists (`/events`, `/me/orders`, `/me/tickets`):

```
GET /events?limit=20&cursor=eyJzIjoiMjAyNi0xMS0xNFQxOTozMDowMFoiLCJpIjoiMDE5My4uLiJ9
→ { "data": [...], "nextCursor": "..." | null }
```

- `limit` is 1–100 (default 20). The cursor is opaque base64url; clients must not parse it.
- Cursors are stable under inserts, so no duplicates or skips occur while scrolling.

**Offset pagination** applies to organizer and admin tables, which need page numbers and totals:

```
GET /admin/users?page=2&pageSize=50&q=alice&sort=-createdAt
→ { "data": [...], "page": 2, "pageSize": 50, "total": 1312 }
```

- `sort` is a field name, with a `-` prefix for descending order. Each endpoint documents its allowed sort fields.
- Filters are plain query parameters (`city`, `category`, `from`, `to`, `status`). `q` is full-text search.

## 5. Idempotency

| Endpoint | Mechanism |
|---|---|
| `POST /holds/{holdId}/checkout` | `Idempotency-Key` header **required** (UUID). The same key returns the same order. The same key with a different hold returns `IDEMPOTENCY_KEY_REUSED`. Keys are scoped per user and stored on the order. |
| `POST /events/{eventId}/holds` | Naturally idempotent: a new hold replaces the caller's previous hold for the event |
| `DELETE /holds/{holdId}` | Releasing an already-released hold returns `204` |
| `POST /webhooks/stripe` | Deduplicated by Stripe event ID |

Clients generate one idempotency key per checkout *attempt* (per page load), and reuse it on network retries.

## 6. Rate limits

Limits are per IP for anonymous requests and per user for authenticated ones. Responses include `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` headers.

| Endpoint group | Limit |
|---|---|
| `POST /auth/login`, `/auth/register`, `/auth/forgot-password` | 5 / minute / IP, and 20 / hour / email |
| `POST /events/{id}/holds` | 10 / minute / user |
| `POST /holds/{id}/checkout` | 10 / minute / user |
| Other authenticated endpoints | 300 / minute / user |
| Anonymous reads | 120 / minute / IP |
| `POST /webhooks/stripe` | Not limited (signature-verified) |

## 7. Caching

| Resource | Caching |
|---|---|
| `GET /events`, `GET /events/{id}` | `Cache-Control: public, max-age=30`; served from the CDN |
| `GET /events/{id}/seat-map` (layout: positions, labels, sections, prices) | `Cache-Control: public, max-age=3600` plus a strong `ETag`. The layout is immutable once the event is published. |
| `GET /events/{id}/seats` (live statuses) | `Cache-Control: no-store` |
| Everything under `/me`, `/organizer` or `/admin` | `Cache-Control: private, no-store` |

**Why the seat map is split in two:** the layout for a 2,000-seat venue is large but never changes, so browsers and the CDN cache it. Statuses are small and change constantly, so they're fetched fresh and then kept current over the WebSocket.

**Status snapshot format** (compact, about 20 KB gzipped for 2,000 seats):

```json
{
  "eventId": "0193...",
  "generatedAt": "2026-11-01T18:02:11Z",
  "seats": [
    ["0193...01", "available", 0],
    ["0193...02", "held", 3],
    ["0193...03", "sold", 4]
  ]
}
```

Each tuple is `[seatId, status, version]`. Expired holds are already reported as `available`.

## 8. WebSocket contract (Socket.IO)

| | |
|---|---|
| Endpoint | `wss://api.<domain>` · Socket.IO path `/socket.io` · namespace **`/realtime`** |
| Auth | Optional: `io('/realtime', { auth: { token: accessToken } })`. Anonymous sockets can watch seat maps; authenticated sockets also join their private `user:{userId}` room. |
| Transports | WebSocket first, with long-polling fallback |

See [ADR-0006](adr/0006-realtime-socketio-redis-adapter.md).

### Client → server

| Event | Payload | Ack |
|---|---|---|
| `event:subscribe` | `{ eventId }` | `{ ok: true }` or `{ ok: false, code: "NOT_FOUND" }` |
| `event:unsubscribe` | `{ eventId }` | `{ ok: true }` |

A socket may be subscribed to at most 5 events at once.

### Server → client

| Event | Room | Payload | Client action |
|---|---|---|---|
| `seat:update` | `event:{eventId}` | `{ eventId, changes: [{ seatId, status, version }] }` | For each change, apply it if `version` is newer than the cached version; otherwise ignore it |
| `hold:expired` | `user:{userId}` | `{ holdId, eventId }` | Show "your hold expired", clear the selection, refetch statuses |
| `order:updated` | `user:{userId}` | `{ orderId, status }` | The confirmation page moves to `paid` or `failed_conflict` without polling |

### Client rules

1. Subscribe **first**, then fetch `GET /events/{id}/seats`, then apply buffered updates by `version`. This order guarantees no update is missed between the fetch and the subscription.
2. On `reconnect`, resubscribe and refetch the snapshot.
3. While the socket is disconnected, refetch the snapshot every 15 s (the polling fallback from PRD §7.7).

## 9. Endpoint overview

The full schemas are in [api/openapi.yaml](api/openapi.yaml).

| Area | Endpoints |
|---|---|
| **Auth** | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` |
| **Me** | `GET /me` · `PATCH /me` · `GET /me/orders` · `GET /me/tickets` |
| **Events (public)** | `GET /events` · `GET /events/{eventId}` · `GET /events/{eventId}/seat-map` · `GET /events/{eventId}/seats` |
| **Holds** | `POST /events/{eventId}/holds` · `GET /holds/{holdId}` · `DELETE /holds/{holdId}` · `POST /holds/{holdId}/checkout` |
| **Orders and tickets** | `GET /orders/{orderId}` · `GET /tickets/{ticketId}` · `GET /tickets/{ticketId}/pdf` |
| **Organizer: venues** | `GET, POST /organizer/venues` · `GET, PATCH, DELETE /organizer/venues/{venueId}` · `PUT /organizer/venues/{venueId}/layout` |
| **Organizer: events** | `GET, POST /organizer/events` · `GET, PATCH, DELETE /organizer/events/{eventId}` · `POST …/publish` · `POST …/cancel` · `POST …/seats/block` · `POST …/seats/unblock` · `GET …/stats` |
| **Organizer: uploads** | `POST /organizer/uploads/cover-image` (returns a presigned URL) |
| **Admin** | `GET /admin/users` · `PATCH /admin/users/{userId}` · `GET /admin/events` · `POST /admin/events/{eventId}/cancel` · `GET /admin/orders` |
| **Webhooks** | `POST /webhooks/stripe` |
| **Ops** | `GET /health/live` · `GET /health/ready` · `GET /metrics` (internal network only) |

**Notes on refinements to the PRD outline (§11):**
- The seat map is split into `seat-map` (cacheable layout) and `seats` (live statuses). See §7.
- `/ws/events/:id` becomes one Socket.IO connection with per-event rooms. See §8.
- Admin "unpublish" (story A2) is `POST /admin/events/{eventId}/cancel`. Once seats can be sold, taking an event down must refund buyers, so it's a cancellation, not a return to draft.
- **Cancelling an event** (organizer or admin) cancels all tickets, refunds paid orders through the outbox, releases holds, and emails ticket holders.
