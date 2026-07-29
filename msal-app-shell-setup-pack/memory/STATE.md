# State

Last updated: 2026-07-29.

## Where things stand

Workspace created. Both source architectures were read and compared
(`../analysis/02-approach-comparison.md`). Microsoft guidance and the additional
`research.md` were checked against current primary sources; corrections are appended to
`../analysis/01-microsoft-guidance-review.md`.

All twenty topics are `settled`: `topology` (1), `bff-alternative` (2),
`entra-registration` (3), `msal-instance-and-bootstrap` (4), `redirect-bridge` (5),
`account-resolution` (6), `token-acquisition` (7), `authorized-http` (8),
`interaction-recovery` (9), `cross-tab-and-logout` (10), `routing-and-deep-links` (11),
`authorization-layers` (12), `cache-and-storage` (13),
`cae-and-claims-challenge` (14), `token-lifetime-24h` (15),
`workspace-and-packages` (16), `nginx-and-headers` (17), `observability` (18),
`testing` (19), and `version-baseline` (20).
The architecture is **three independently deployed SPAs on one origin, composed by
navigation, with MSAL in the browser**. No curated architecture topic remains
`not-started`.

Settled invariants that every later topic inherits:

- Three documents: `apps/portal`, `apps/child0`, `apps/child1`. `/child0/*` serves
  child0's own `index.html`. Application switch is a full page navigation.
- Exactly one `PublicClientApplication` per loaded document. State shared only through the
  same-origin MSAL cache, which makes identical origin, client ID, authority and `cache`
  config a hard invariant.
- Runtime config: one `/portal-runtime.json`, top level keyed by application id, each app
  reads only its own key, served `no-store`, no secrets.
- MSAL stays in the browser. No BFF. The 24-hour SPA refresh-token wall and the shared-XSS
  blast radius are accepted consequences.
- The portal owns application discovery only; child0 and child1 own authorization through
  their independently deployed backends. A payload-free `BroadcastChannel` logout signal
  remains ported from the app-shell pack.
- One portal-owned `/auth-redirect.html` bridge, shared by all three apps as `redirectUri`,
  no COOP, `no-store`, same-origin assets only. `/auth/callback` deleted. Only the portal
  explicitly processes `handleRedirectPromise` before render; `MsalProvider`'s internal
  idempotent call is accepted in every app.
- `createStandardPublicClientApplication` initializes but does not consume a redirect.
  Portal bootstrap calls
  `handleRedirectPromise({ navigateToLoginRequestUrl: false })`, then resolves the active
  account, then renders one `MsalProvider`. No mirrored auth store.
- Return navigation belongs to the continuation record, not `navigateToLoginRequestUrl`.
- An unauthenticated direct child route writes a validated tab-local continuation and
  hands off to `/auth/continue`. The portal attempts `ssoSilent` once, owns any
  interactive fallback, and returns to the exact validated child route without allowing
  an authentication loop.
- A bridge timeout is a distinct non-interactive failure, never `interaction-required`.
- Bridge timeouts begin explicitly at iframe `10_000` ms and popup `60_000` ms.
- Exact baseline: `@azure/msal-browser@5.17.3`,
  `@azure/msal-react@5.5.4`, React/DOM `19.2.8`, React Router `8.3.0`, Vite `8.1.5`,
  TypeScript `7.0.2`, pnpm `11.18.0`, Node `>=22.22.2`; one physical MSAL copy.
- Exact quality baseline: Vitest `4.1.10`, Playwright Test `1.62.0`, jsdom `30.0.1`,
  Oxlint `1.76.0`, and `oxlint-tsgolint` `7.0.2001`; `typescript-eslint` is excluded
  because its current peer range does not support TypeScript 7.
- Local development is single-origin, mirroring the production route map.
- Portal, child0, and child1 are one logical browser client and one shared browser
  security boundary. They use one SPA registration per environment; every backend is a
  separate protected API registration and audience.
- Account resolution is active-if-valid, zero → unauthenticated, one → set active,
  multiple → portal-owned selection. Raw `AccountInfo` stays inside the auth adapter.
- `localStorage` belongs to MSAL only, with `cacheRetentionDays: 5`. Application storage
  is limited to the ten-minute continuation and an opaque tab ID in `sessionStorage`.
- Token acquisition is silent, account-explicit and resource-pinned. Tokens stay inside
  the HTTP adapter; equivalent in-document requests share a promise.
- A 401 permits one meaningful replay: `forceRefresh: true`, plus validated in-memory
  claims when present. No authentication retry for 403, 429, or 5xx.
- `clientCapabilities: ["CP1"]` is enabled only with the server-side claims relay. Raw
  challenges remain in memory/server storage; only a five-minute single-use opaque ID
  crosses portal navigation.
- Interaction recovery uses one validated ten-minute tab-local continuation. Background
  recovery shows an explicit portal Continue action; children never interact.
- Token renewal is on demand. The fixed SPA refresh-token lifetime has no countdown or
  reload timer; real interaction-required outcomes use the continuation.
- Logout is portal-only and single-initiator. Other documents clear/block locally on
  `company.portal.auth.v1`; MSAL/lifecycle events are the no-channel fallback.
- Kubernetes Ingress preserves paths and selects the owner by exact/prefix match; each
  service owns its Vite/router base, history fallback, cache policy and 404s.
- Portal application discovery is UX. Child0 and child1 authorize through their own
  `/me` endpoints, and every API validates its own exact audience, delegated permission
  and domain policy; direct child routes remain safe.
- Ingress owns TLS/HSTS. Web-service nginx owns CSP/cache/fallbacks. Normal pages deny
  framing and use COOP; the bridge is no-store, same-origin-frameable and has no COOP.
- One pnpm workspace compiles shared packages into three independent SPA images.
  `app-chrome` is duplicated per document; local nginx exposes only localhost:4173.
- Auth observability is a redacted stable outcome schema plus W3C tracing to owned APIs;
  it never serializes MSAL payloads, identity, full URLs or bearer material.
- Release proof combines static/unit/contracts, built nginx/routes, Chromium/Firefox/
  WebKit, protected real-Entra smoke, and scheduled CAE/24-hour suites.

## Blocking now

Nothing is blocking.

## Next up

1. Scaffold the implementation workspace, apps, shared packages and local gateway from
   the settled topic files.
2. Provision non-production Entra client/API registrations, APIs and claims relay.
3. Implement Kubernetes/nginx/runtime-config delivery and retained-asset rollout.
4. Implement the full test matrix and obtain real three-document/CAE/24-hour evidence.
5. Supply the product, identity, security, operations and deployment inputs listed below.

## Remaining implementation and deployment work

The architecture choices are settled; these items need real systems or owner input.
The consolidated hand-off is [`../IMPLEMENTATION-GAPS.md`](../IMPLEMENTATION-GAPS.md).

1. **No application/deployment repository exists here.** Package installation, builds,
   containers, APIs, ingress and runtime behavior have not been executed.
2. **Identity inputs:** tenant ID, one environment SPA client ID, API resource IDs/scopes,
   consent, assignment, KMSI, Conditional Access and sign-in-frequency policies.
3. **Backend capabilities:** one portal application-discovery endpoint, child-owned
   profile/capability/policy endpoints, exact token validation, idempotency contracts,
   and the five-minute claims relay with service authentication/rate limits.
4. **Delivery inputs:** production host/TLS/ingress class, runtime JSON generation,
   ConfigMap ownership, release-qualified asset retention, registries and exact
   builder/nginx/ingress/browser image digests.
5. **Product inputs:** portal/account/recovery/logout/error UX, route manifests, domain
   authorization rules, long-running draft preservation and accessibility review.
6. **Operations/privacy inputs:** exporter/vendor, CSP reporting, region/retention/access,
   sampling, SLO/error budgets, alert ownership and approved event dictionary.
7. **Evidence:** one physical MSAL resolution; enforcing CSP; direct-child silent-first
   sign-in/exact return; all browser/deep-link/multi-tab/concurrent-renewal tests;
   wrong-audience denial; protected real-Entra three-document smoke; CAE challenge; and
   an actual approximately-24-hour soak.

Resolved since the last update: the full-page bridge hand-off, the v5
`navigateToLoginRequestUrl` placement, bridge timeout defaults, package availability/peer
ranges, and the nginx `add_header_inherit` version floor. Cross-version bridge
interoperability remains undocumented but is removed from the deployed design by `0013`'s
single exact MSAL resolution.

## Decisions so far

| # | Topic | Decision |
|---|---|---|
| 0001 | workspace | Curation workspace structure adopted |
| 0002 | topology | Navigational composition, one document and one MSAL instance per app |
| 0003 | bff-alternative | MSAL stays in the browser; BFF / token handler rejected |
| 0004 | topology | One `/portal-runtime.json` keyed by app; each app reads only its key |
| 0005 | authorization-layers | Superseded by 0030: port the portal launch-entitlement check |
| 0006 | cross-tab-and-logout | Port the payload-free `BroadcastChannel` logout signal |
| 0007 | redirect-bridge | One portal-owned bridge document shared by all three apps; `/auth/callback` deleted |
| 0008 | redirect-bridge | Continuation record owns return navigation; `navigateToLoginRequestUrl` is a `handleRedirectPromise` option |
| 0009 | redirect-bridge | Bridge timeout is a distinct non-interactive failure, never `interaction-required` |
| 0010 | redirect-bridge | Local development is served from a single origin |
| 0011 | msal-instance-and-bootstrap | Bootstrap once before render; MSAL context remains the state source |
| 0012 | msal-instance-and-bootstrap | Start with explicit v5 default bridge timeouts |
| 0013 | version-baseline | Pin one exact, compatible frontend and MSAL baseline |
| 0014 | version-baseline | Use a TypeScript 7-compatible exact quality toolchain |
| 0015 | entra-registration | Treat all three route owners as one logical SPA client; keep API registrations separate |
| 0016 | account-resolution | Resolve accounts deterministically; portal owns selection |
| 0017 | cache-and-storage | Reserve localStorage for MSAL with five-day retention |
| 0018 | token-acquisition | Keep token acquisition silent, account-explicit and resource-pinned |
| 0019 | authorized-http | Permit one forced/claims-aware authentication replay |
| 0020 | cae-and-claims-challenge | Relay navigation-spanning claims challenges by opaque handle |
| 0021 | interaction-recovery | Recover interaction through one explicit portal continuation |
| 0022 | token-lifetime-24h | Renew on demand and recover explicitly at the SPA lifetime boundary |
| 0023 | cross-tab-and-logout | Make logout portal-only and single-initiator |
| 0024 | routing-and-deep-links | Preserve route prefixes and keep fallbacks application-owned |
| 0025 | authorization-layers | Superseded by 0030: keep portal launch authorization as UX and APIs as authority |
| 0026 | nginx-and-headers | Keep SPA headers/fallbacks in services with a bridge exception |
| 0027 | workspace-and-packages | Compile shared workspace packages and use a single-origin dev gateway |
| 0028 | observability | Observe auth through redacted stable outcomes |
| 0029 | testing | Require layered browser and real-Entra release proof |
| 0030 | authorization-layers | Keep child authorization endpoints with independently deployed child backends |
| 0031 | interaction-recovery | Make direct child entry a bounded silent-first portal sign-in flow |
