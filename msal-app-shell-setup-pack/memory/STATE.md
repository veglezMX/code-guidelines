# State

Last updated: 2026-07-29.

## Where things stand

Workspace created. Both source architectures were read and compared
(`../analysis/02-approach-comparison.md`). Microsoft guidance and the additional
`research.md` were checked against current primary sources; corrections are appended to
`../analysis/01-microsoft-guidance-review.md`.

Fourteen topics are `settled`: `topology` (1), `bff-alternative` (2),
`entra-registration` (3), `msal-instance-and-bootstrap` (4), `redirect-bridge` (5),
`account-resolution` (6), `token-acquisition` (7), `authorized-http` (8),
`interaction-recovery` (9), `cross-tab-and-logout` (10), `cache-and-storage` (13),
`cae-and-claims-challenge` (14), `token-lifetime-24h` (15), and `version-baseline` (20).
The architecture is **three independently deployed SPAs on one origin, composed by
navigation, with MSAL in the browser**. Six topics are `not-started`.

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
- Ported from the app-shell pack: portal launch entitlement (`canLaunch` + guard), and a
  payload-free `BroadcastChannel` logout signal.
- One portal-owned `/auth-redirect.html` bridge, shared by all three apps as `redirectUri`,
  no COOP, `no-store`, same-origin assets only. `/auth/callback` deleted. Only the portal
  explicitly processes `handleRedirectPromise` before render; `MsalProvider`'s internal
  idempotent call is accepted in every app.
- `createStandardPublicClientApplication` initializes but does not consume a redirect.
  Portal bootstrap calls
  `handleRedirectPromise({ navigateToLoginRequestUrl: false })`, then resolves the active
  account, then renders one `MsalProvider`. No mirrored auth store.
- Return navigation belongs to the continuation record, not `navigateToLoginRequestUrl`.
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

## Blocking now

Nothing is blocking.

## Next up

1. `routing-and-deep-links` (11) — exact ingress precedence and app-owned fallbacks.
2. `authorization-layers` (12) — portal launch UX plus backend authority.
3. `nginx-and-headers` (17) — SPA caches/fallbacks and the shared security-header policy.
4. `workspace-and-packages` (16) — package boundaries and the single-origin dev gateway.
5. `observability` (18), then `testing` (19) — privacy-safe evidence and release gates.

## Open items carried in

Established during analysis or during the topology session, not yet decided.

1. **Pack renders `error.message`.** Under v5 that string is a docs URL. Same problem in
   its `loggerCallback`, since v5 console messages are hashed. The independent approach
   already handles this correctly. → topic `observability`.
2. **Portal backend dependency.** `0005` requires a `canLaunch` endpoint that exists in
   neither source's backend scope. Needs an owner. → topic `authorization-layers`.
3. **Shared chrome undecided.** Full-page navigation means no persistent nav bar; whether
   chrome is packaged, duplicated, or omitted is open. → topic `workspace-and-packages`.
4. **Single-origin dev mechanism unchosen.** `0010` fixes the constraint, not the tool.
    → topic `workspace-and-packages`.
5. **Cross-instance renewal races are not validated.** MSAL deduplicates equivalent
    silent requests within one PCA, not across the three live PCAs. Gate child startup
    behind account resolution and test simultaneous renewals. → topics `token-acquisition`
    and `testing`.
6. **Version set is not runtime-proven.** Registry availability, peer ranges, engines,
    and nginx directive support are verified; installation/build/browser validation and
    exact container digests remain. → topics `workspace-and-packages`, `testing`.
7. **No official v5 multi-SPA how-to.** Shared-origin/shared-client cache behavior is
    assembled from Microsoft SSO/caching guidance and package source. Validate the exact
    three-document deployment in the browser matrix. → topic `testing`.

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
| 0005 | authorization-layers | Port the portal launch-entitlement check |
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
