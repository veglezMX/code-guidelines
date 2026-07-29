# 0015 — Treat the three SPAs as one logical browser client

Status: accepted
Date: 2026-07-29
Topic: entra-registration

## Context

The requested topology uses one client ID across three independently deployed,
same-origin route owners. Microsoft guidance also cautions against using one app
registration for multiple unrelated applications.

## Decision

Register portal, child0, and child1 as one tenant-specific SPA client **only because**
they are one logical product client with common governance, trust, and browser security
boundary. Use distinct protected API registrations and audiences for portal-api,
child0-api, and child1-api. Use a separate client registration per environment.

## Why

One client registration is required for the settled shared-cache model. Naming the true
boundary prevents the design from being copied to unrelated applications. Separate
resource registrations preserve backend audience validation and ownership.

## Rejected

- Reuse one client ID across independently governed/unrelated products.
- Collapse client and resource APIs into one registration.
- Give every route owner a callback; one exact shared bridge is sufficient.

## Evidence

- [Microsoft redirect URI guidance](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url).
- [Microsoft Zero Trust registration guidance](https://learn.microsoft.com/en-us/entra/identity-platform/zero-trust-for-developers).
- [Microsoft protected API configuration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis).

## Consequences

All three frontends share an XSS/authentication blast radius. If their trust or ownership
diverges, the registration model must change. Each backend remains authoritative for its
own audience, scope/role, and domain permission.
