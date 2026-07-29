# 0030 — Keep child authorization endpoints with child backends

Status: accepted
Date: 2026-07-29
Topic: authorization-layers
Supersedes: 0005, 0025

## Context

Decisions `0005` and `0025` placed child-specific `canLaunch` endpoints under the portal
API. The actual deployment boundary is different: child0 and child1 are independent SPAs
with independently deployed backends. Their frontend code happens to live in the same
repository, and all three browser documents intentionally share one tenant-specific Entra
SPA client ID and compatible MSAL configuration.

Portal-owned child endpoints would make the portal backend a policy coordinator for
services it does not own and would duplicate child authorization decisions.

## Decision

The portal API owns only application discovery:

```http
GET /api/portal/v1/me/applications
```

Each child backend owns its profile, capability, and initial access decision:

```http
GET /api/child0/v1/me
GET /api/child1/v1/me
```

There are no portal endpoints at
`/api/portal/v1/me/applications/child0` or
`/api/portal/v1/me/applications/child1`.

The three SPAs use the same tenant ID, SPA client ID, tenant-specific authority, and
compatible cache configuration. This shared browser client does not merge the APIs: every
backend remains an independently registered protected resource and validates its own
audience, delegated permission, and domain policy.

## Why

Endpoint ownership now matches deployment and policy ownership. Portal navigation remains
useful without becoming an authorization boundary, and both direct URLs and portal
navigation reach the same child-owned authorization check.

Microsoft Entra distinguishes the client application that requests a token from the web
API resource that exposes scopes and receives the token. Keeping API resources distinct
preserves exact audience validation even while all browser documents share one SPA
client.

## Rejected

- Portal-owned per-child `canLaunch` endpoints, because they centralize child policy and
  couple independent backend deployments.
- Treating the portal application list or token acquisition as entitlement proof.
- A single API audience for all backends, because it removes resource-level audience
  isolation.

## Evidence

- [Microsoft: configure an application to expose a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis).
- [Microsoft: verify scopes and app roles in a protected API](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles).

## Consequences

- The portal backend implements one discovery endpoint, not per-child authorization
  endpoints.
- Each child backend implements and tests its own `/me` authorization/capability
  contract.
- The portal may show a stale or permissive navigation hint; the child backend still
  denies unauthorized access with `403`.
- Frontend integration tests must prove that all three documents use the same tenant and
  SPA client ID while API contract tests prove independent audience and policy
  enforcement.
