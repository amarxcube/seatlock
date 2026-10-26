# ADR-0008: JWT access tokens with rotating refresh tokens

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

We need stateless authentication for horizontally scaled API instances and the WebSocket handshake, plus the ability to revoke sessions (logout, disabled users, stolen tokens). The SPA is served from a different origin than the API in some environments.

## Decision

- **Access token:** a JWT signed with HS256, 15-minute lifetime, claims `sub`, `role`, `iat`, `exp`. It's held **in memory** in the SPA (not in localStorage) and sent as `Authorization: Bearer`.
- **Refresh token:** an opaque random value (256 bits), 7-day lifetime, stored **hashed** (SHA-256) in `refresh_tokens` with a `family_id`. It's sent as an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `/api/v1/auth`.
- **Rotation:** each `/auth/refresh` call revokes the presented token and issues a new one in the same family. **Reuse detection:** presenting an already-revoked token revokes the entire family and forces a fresh login.
- **Disabled users:** the refresh endpoint checks `users.status`. Access tokens die within 15 minutes; admin "disable" also revokes all of the user's token families.
- **Passwords:** argon2id (memory 19 MiB, iterations 2, parallelism 1, following OWASP's guidance).
- The WebSocket handshake accepts the access token in `auth.token`. Anonymous connections are allowed, because seat maps are public.

## Alternatives considered

- **Server-side sessions in Redis:** simple revocation, but makes Redis critical for every request.
- **Long-lived JWT in localStorage:** vulnerable to XSS token theft and impossible to revoke.
- **Auth provider (Auth0, Clerk):** faster to ship, but hides exactly the skills this project is meant to demonstrate.

## Consequences

- **Positive:** stateless authorization on the hot path; revocable sessions; theft detection through reuse detection.
- **Negative:** a disabled user's access token stays valid for up to 15 minutes. The SPA needs silent-refresh logic, plus a single-flight lock so parallel requests trigger only one refresh.
