# 0025 — Keep portal launch authorization as UX and APIs as authority

Status: accepted
Date: 2026-07-29
Topic: authorization-layers

## Context

Decision `0005` requires a portal launch check, but direct deep links and API calls bypass
the portal. The shared client ID also cannot structurally prevent browser code from
requesting another resource's scope.

## Decision

The portal API owns application discovery and a fresh per-click `canLaunch` check.
Children fetch UI capabilities from their own APIs. Every backend independently validates
token signature/issuer/tenant/audience/time/permission and domain authorization on each
protected operation.

Frontend state contains stable capability results, never decoded roles/group claims.

## Why

Users get accurate navigation while direct routes remain secure. Exact backend audiences
are the only enforceable resource boundary under the chosen browser topology.

## Rejected

- Treat token acquisition or portal navigation as entitlement.
- Trust frontend route/capability guards.
- Decode access/ID tokens for API authorization.
- Use one audience for all APIs.

## Evidence

- [Microsoft protected API authorization](https://learn.microsoft.com/en-us/entra/msidweb/authentication/authorization).
- [Microsoft scope/role validation](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles).

## Consequences

Portal and child backend teams must implement their endpoints/policies. Tests must prove
wrong-audience tokens and direct-route denial fail at the backend.
