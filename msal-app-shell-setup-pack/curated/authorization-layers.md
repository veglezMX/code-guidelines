# Authorization Layers

Status: settled
Decisions: 0005, 0025 · inherits 0015, 0016, 0019
Sources: pack `10` · independent §16.6, §17 · analysis `02` §6.1 ·
[Protected API authorization](https://learn.microsoft.com/en-us/entra/msidweb/authentication/authorization) ·
[Scope and role verification](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles) ·
[ID tokens](https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens)

## Rule

Portal launch checks and child UI capabilities improve navigation and UX; they never
grant backend access. Every API validates the token for itself and applies resource/domain
authorization on every protected operation.

## Design

The portal API owns launch discovery:

```http
GET /api/portal/v1/me/applications
GET /api/portal/v1/me/applications/child0
GET /api/portal/v1/me/applications/child1
```

The list drives visible navigation. Before every child launch, the portal revalidates the
specific application and requires:

```json
{
  "applicationId": "child0",
  "canLaunch": true,
  "reasonCode": null
}
```

Responses contain stable application/capability codes only—no names, emails, group lists,
or role names. Keep them in memory, never browser storage. A list result may be cached in
memory for display for at most 60 seconds, but the launch click always performs the
specific check. Denial stays in the portal and does not probe the child.

Direct child URLs remain safe without the portal guard. On bootstrap, each child calls
its own API for a domain profile/capability document. The backend may return boolean or
stable capability codes for UI gating, but the frontend never treats them as proof for a
later request. Every protected API operation rechecks authorization.

Each backend:

1. validates signature, trusted tenant/issuer, exact audience and time bounds;
2. distinguishes delegated `scp` from application `roles` and requires the intended
   permission type;
3. keys the subject by `tid` + `oid`, not display/email claims;
4. evaluates domain data ownership, assignment, policy, and revocation;
5. returns `401` for absent/invalid authentication and `403` for a valid identity lacking
   permission;
6. does not disclose whether a protected resource exists when that distinction would
   leak information.

ID tokens never authorize APIs. Frontends do not decode access tokens for capabilities.
Group/role claims are not copied into application state; group overage and directory
lookups are backend concerns.

The shared client ID creates a deliberately soft frontend token boundary: malicious
same-origin code may request another resource's scope. Per-app runtime slices,
resource-pinned adapters, code review, and bundle tests reduce accidents, but only the
receiving backend's exact audience and policy enforce access.

The portal backend team owns the launch endpoints. Each child backend team owns its
capability endpoint and every domain authorization policy. The identity team owns scopes,
roles, consent, and tenant assignment; none of those responsibilities belongs to ingress
or the React router.

## Why not the alternatives

- **Token acquisition means launch permission** — rejected by `0005`; a token is not a
  product entitlement decision.
- **Portal guard is the security boundary** — rejected in `0025`; direct deep links and
  direct API calls bypass it.
- **Frontend-decoded roles/groups** — rejected in `0025`; they become stale, leak into
  state, and cannot replace API validation.
- **One audience for all APIs** — rejected in `0015`; it weakens resource isolation and
  ownership.
- **Return only 403 for every auth failure** — rejected in `0025`; the client needs the
  standard 401/403 distinction for bounded recovery versus denial.

## Open

1. Product/domain owners must define actual launch and per-operation policies.
2. The identity owner must choose delegated scopes versus app roles for every
   non-interactive caller; this browser suite uses delegated scopes.
3. API technology-specific validation middleware belongs in each implementation
   repository.
