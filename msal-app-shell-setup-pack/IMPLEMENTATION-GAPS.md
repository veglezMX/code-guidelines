# Implementation Gaps Report

Date: 2026-07-29

## Outcome

Architecture curation is complete: all 20 manifest topics are settled and decision records
`0001`–`0031` are present (`0005` and `0025` are superseded by `0030`). This workspace is
a research/decision pack, not an application repository. No frontend, backend, container,
Kubernetes resource, Entra registration or runtime test has been implemented here.

The most important boundary is explicit: portal, child0 and child1 share one tenant and
one SPA client ID as **one logical browser client and one shared security boundary**.
Their backends remain independently deployed protected resources with separate
registrations/audiences. If the browser frontends become independently governed or
unrelated products, the one-registration decision must be replaced.

## Missing before implementation can be configured

| Input | Owner | Required output |
|---|---|---|
| Tenant/environment model | Identity + security | tenant ID, single/multi-tenant choice, prod/non-prod separation |
| Entra identifiers | Identity | one SPA client ID per environment; portal/child0/child1 API IDs and scopes |
| Identity policy | Identity + security | assignment, consent, KMSI, Conditional Access, sign-in frequency, CAE test policy |
| Public edge | Platform | production host, DNS, TLS/certificate issuer, ingress class/version |
| Product routes/UX | Product + frontend | route manifests; sign-in, account, continue, logout, denial and error copy/design |
| Domain authorization | Product + API owners | portal discovery rules, child access/capabilities, per-operation policies and idempotency contracts |
| Operations/privacy | Operations + privacy | telemetry vendor/region/retention/access, CSP reporting, SLOs and alert ownership |

## Missing implementation artifacts

### Frontend/workspace

- Root pnpm workspace, exact package catalog/overrides, lockfile and CI tasks.
- `apps/portal`, `apps/child0`, `apps/child1` with prefix-aware Vite/React Router builds.
- Portal's minimal `/auth-redirect.html`, `/signed-out`, `/login`, `/logout`,
  `/account/select` and `/auth/continue`.
- Shared runtime-config, auth-core, auth-react, authorized-http, session-sync,
  observability, app-chrome and test-support packages.
- Deterministic account selection, silent token deduplication, resource pinning, bounded
  retry, continuation validation, direct-child silent-first portal sign-in, CAE relay
  client and portal-only logout.
- Local nginx gateway on `http://localhost:4173` with three Vite upstreams and API stubs.

### Backend/identity

- Actual Entra SPA/API registrations, exact redirect URIs, scopes and admin consent.
- One portal application-discovery endpoint and independently owned child
  profile/capability/domain-policy endpoints.
- Signature/issuer/tenant/audience/time/scope/role validation in every API.
- No-mutation-before-401 and non-idempotent idempotency behavior.
- Five-minute single-use claims-challenge relay, workload identity/mTLS, rate limits,
  subject/resource binding and deletion/retention controls.

### Platform/delivery

- Environment runtime JSON generation and ConfigMap ownership/mount.
- Kubernetes Ingress exact/prefix paths with no regex/rewrite and four API/web service
  groups plus the claims relay.
- SPA nginx configs, bridge header exception, enforcing CSP, cache rules and Pod probes.
- Release-qualified immutable asset publication/retention and blue/green HTML switch.
- Build/runtime/ingress/browser image digests, registry/provenance, scanning and rollback.

### Operations

- Redacted telemetry exporter and approved event dictionary.
- W3C trace propagation through ingress/APIs without URL/query/auth material.
- Dashboards/alerts for bootstrap, bridge, continuation, renewal, claims, 401 replay,
  logout, CSP and missing chunks.
- Measured baselines and SLO/error budgets; browser telemetry is not the audit source.

## Missing validation evidence

These are release blockers, not optional follow-up:

1. Exact dependencies install/build on Node `>=22.22.2`; one physical MSAL Browser/React
   resolution; exact portal bridge bundle.
2. Unit/property coverage for config, accounts, resource URLs, continuation/redirect
   validation, claims, retries, channel messages and redaction.
3. API contracts proving wrong audience/direct routes fail at the backend and 401/403
   behavior is correct.
4. Live nginx/ingress responses proving deep links, 404s, cache headers, CSP, COOP/frame
   rules and the bridge exception.
5. Playwright Chromium, Firefox and WebKit at one origin, including direct-child
   silent-first sign-in and exact return, multi-tab logout, multiple accounts, missing
   storage/bridge, simultaneous renewal and retained chunks.
6. Protected real-Entra smoke for one shared client ID across all three documents,
   PKCE/redirect bridge, shared cache, silent renewal, logout and exact redirect URIs.
7. Test-tenant CAE challenge/opaque relay proof and a real approximately-24-hour
   refresh-token-boundary soak.
8. Security/privacy proof that logs, telemetry and retained CI artifacts contain no
   tokens, auth codes, claims, identity fields, full URLs, cookies or headers.

## Suggested execution order

1. Freeze owners and the identity/product/platform inputs above.
2. Scaffold/install the workspace and make one-origin local routing/builds pass.
3. Provision non-production Entra registrations, APIs and claims relay.
4. Implement auth/account/token/continuation/logout behavior behind shared packages.
5. Add nginx/Kubernetes/runtime-config and immutable-asset delivery.
6. Build the layered tests, then obtain protected real-Entra/CAE/24-hour evidence.
7. Approve telemetry/privacy/SLOs and promote portal first, then child0, then child1.

Production readiness is not achieved until all eight validation items have evidence.
