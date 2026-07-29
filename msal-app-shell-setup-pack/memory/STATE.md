# State

Last updated: 2026-07-29.

## Where things stand

Workspace created. Both source architectures were read and compared
(`../analysis/02-approach-comparison.md`). Microsoft guidance and the additional
`research.md` were checked against current primary sources; corrections are appended to
`../analysis/01-microsoft-guidance-review.md`.

Five topics are `settled`: `topology` (1), `bff-alternative` (2),
`msal-instance-and-bootstrap` (4), `redirect-bridge` (5), and `version-baseline` (20).
The architecture is **three independently deployed SPAs on one origin, composed by
navigation, with MSAL in the browser**. Fifteen topics are `not-started`.

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
  TypeScript `7.0.2`, pnpm `11.18.0`, Node `>=22.22.0`; one physical MSAL copy.
- Local development is single-origin, mirroring the production route map.

## Blocking now

Nothing is blocking.

## Next up

1. `account-resolution` (6) — the independent approach's model is clearly better; likely a
   quick settle.
2. `entra-registration` (3) — one shared SPA registration, one bridge redirect URI per
   environment, per-backend API registrations.
3. `token-acquisition` (7) — must add the `bridge-unavailable` outcome required by `0009`,
   and fix the no-op 401 retry (comparison §7.5).
4. `interaction-recovery` (9) — continuation record detail, per `0008`.
5. `cache-and-storage` (13) — document the `localStorage` / KMSI trade-off and decide
   `cacheRetentionDays`.

## Open items carried in

Established during analysis or during the topology session, not yet decided.

1. **Pack leaks raw `AccountInfo` to children.** Pack-internal contradiction; still worth
   carrying because the redacted `AuthenticatedUser` shape is the better model.
   → topic `account-resolution`.
2. **Pack renders `error.message`.** Under v5 that string is a docs URL. Same problem in
   its `loggerCallback`, since v5 console messages are hashed. The independent approach
   already handles this correctly. → topic `observability`.
3. **Neither source implements CAE.** No `clientCapabilities: ["cp1"]`, no
   `WWW-Authenticate` parsing on 401. → topic `cae-and-claims-challenge`.
4. **24-hour SPA refresh-token wall.** Now an accepted consequence of `0003`; the
   mitigation (continuation record, return to exact route) still has to be specified.
   → topic `token-lifetime-24h`.
5. **Soft token boundary.** `0004` stops child0 from *receiving* child1's catalog but
   nothing stops child0's bundle from requesting a `child1-api` token. Enforcement is
   backend audience validation plus per-app adapters plus tests. → topic `authorized-http`.
6. **`localStorage` encryption caveat unmentioned in both.** MSAL skips the AES-GCM
   encryption when the user selects "Keep me signed in". → topic `cache-and-storage`.
7. **Portal backend dependency.** `0005` requires a `canLaunch` endpoint that exists in
   neither source's backend scope. Needs an owner. → topic `authorization-layers`.
8. **Shared chrome undecided.** Full-page navigation means no persistent nav bar; whether
   chrome is packaged, duplicated, or omitted is open. → topic `workspace-and-packages`.
9. **401 retry is a no-op as written.** The independent approach's §16.5 "retry once"
   repeats `acquireTokenSilent`, which returns the same cached token without
   `forceRefresh: true` or a claims challenge. → topic `authorized-http`, comparison §7.5.
10. **Single-origin dev mechanism unchosen.** `0010` fixes the constraint, not the tool.
    → topic `workspace-and-packages`.
11. **Cross-instance renewal races are not validated.** MSAL deduplicates equivalent
    silent requests within one PCA, not across the three live PCAs. Gate child startup
    behind account resolution and test simultaneous renewals. → topics `token-acquisition`
    and `testing`.
12. **`timed_out` recovery conflict.** `research.md` recommends sending a timeout to the
    portal as if interaction were required, citing issue #8434. Accepted decision `0009`
    says the opposite because a broken bridge would loop. Do not supersede `0009` without
    an explicit user decision and a test that distinguishes an operational bridge failure
    from an interaction timeout. → topics `token-acquisition`, `interaction-recovery`.
13. **Version set is not runtime-proven.** Registry availability, peer ranges, engines,
    and nginx directive support are verified; installation/build/browser validation and
    exact container digests remain. → topics `workspace-and-packages`, `testing`.
14. **Signed-out URI detail.** `/signed-out` must be registered and remain MSAL-free for
    `logoutRedirect`. If `logoutPopup` is introduced, its post-logout URI must run the
    bridge instead. → topics `entra-registration`, `cross-tab-and-logout`.
15. **No official v5 multi-SPA how-to.** Shared-origin/shared-client cache behavior is
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
