# ADR-0006: Real-time updates with Socket.IO and the Redis adapter

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Seat maps must reflect other customers' holds and purchases within 2 seconds (PRD story C4). The API runs as several instances, so a change made on instance A must reach viewers connected to instance B. The PRD requires a polling fallback when WebSockets fail.

## Decision

- **Socket.IO** through NestJS's `@WebSocketGateway`, namespace `/realtime`.
- Clients join room `event:{eventId}` while viewing an event. The server emits `seat:update` with `{ seatId, status, version }[]`.
- The **`@socket.io/redis-adapter`** fans out emits across instances.
- Updates are emitted **after** the database transaction commits.
- Clients drop updates whose `version` is not newer than the one they hold, and refetch the full snapshot on reconnect.

This refines the PRD's `/ws/events/:id` endpoint into one connection with per-event rooms. The behaviour is the same, with fewer sockets.

## Alternatives considered

- **Plain `ws`:** lighter, but we'd build rooms, reconnection, heartbeats, the polling fallback and cross-instance fan-out ourselves.
- **Server-Sent Events:** simple and one-way (which is all we need), but needs its own fan-out and is subject to per-domain connection limits.
- **Hosted service (Pusher, Ably):** easy, but an extra vendor and cost; less learning value.
- **Postgres LISTEN/NOTIFY for fan-out:** avoids Redis, but holds a dedicated connection per instance and has a payload size limit.

## Consequences

- **Positive:** reconnection and long-polling fallback come built in; horizontal scaling works.
- **Negative:** the Socket.IO protocol requires the Socket.IO client. The load balancer needs sticky sessions for the long-polling transport, or clients must be configured to use WebSocket only.
- If Redis is down, updates reach only clients on the same instance. Booking is unaffected, and the client's periodic refetch compensates.
