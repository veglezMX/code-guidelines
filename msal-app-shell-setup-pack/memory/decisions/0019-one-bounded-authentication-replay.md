# 0019 — Permit one meaningful authentication replay

Status: accepted
Date: 2026-07-29
Topic: authorized-http

## Context

The independent source's 401 retry reacquires the same cached token, so it is a no-op.
Unbounded interceptors can also attach tokens to unintended origins or loop.

## Decision

Use one exact-origin/base-path resource adapter. On the first 401, request a token with
`forceRefresh: true` (and validated in-memory claims when present), then replay the HTTP
request once. Never authentication-retry 403, 429, or 5xx responses.

## Why

The retry changes the token input and remains bounded. The owned API contract ensures a
401 request performed no protected mutation.

## Rejected

- Reuse the same cached token.
- Generic global interceptor.
- Decode tokens for client authorization.
- Unlimited auth replay.
- Treat non-auth statuses as token failures.

## Evidence

- [Microsoft access-token guidance](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens).
- [Protected API validation](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles).

## Consequences

Backends must honor the no-mutation-before-401 contract and define idempotency for
non-idempotent operations. Repeated 401 is terminal recovery, not another retry.
