# State

Last updated: 2026-07-28.

## Where things stand

Workspace created. Both source architectures read in full and compared
(`../analysis/02-approach-comparison.md`). Microsoft guidance researched and recorded
(`../analysis/01-microsoft-guidance-review.md`).

**The fork is settled**, and so is the bridge. `topology` (1), `bff-alternative` (2) and
`redirect-bridge` (5) are `settled`. The architecture is **three independently deployed
SPAs on one origin, composed by navigation, with MSAL in the browser** — see
`../curated/topology.md` and `../curated/redirect-bridge.md`. The other seventeen topics
are `not-started`.

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
  calls `handleRedirectPromise`.
- Return navigation belongs to the continuation record, not `navigateToLoginRequestUrl`.
- A bridge timeout is a distinct non-interactive failure, never `interaction-required`.
- Local development is single-origin, mirroring the production route map.

## Blocking now

Nothing is blocking.

## Next up

1. `msal-instance-and-bootstrap` (4) — owns every loose end left by topic 5: the single
   `handleRedirectPromise` call site, the `/portal-runtime.json` loader and validator, the
   explicit bridge timeout values, and the `navigateToLoginRequestUrl` placement fix
   (open item 2).
2. `account-resolution` (6) — the independent approach's model is clearly better; likely a
   quick settle.
3. `entra-registration` (3) — one shared SPA registration, one bridge redirect URI per
   environment, per-backend API registrations.
4. `token-acquisition` (7) — must add the `bridge-unavailable` outcome required by `0009`,
   and fix the no-op 401 retry (comparison §7.5).
5. `interaction-recovery` (9) — continuation record detail, per `0008`.

## Open items carried in

Established during analysis or during the topology session, not yet decided.

1. **Unverified: the full-page-redirect hand-off.** Once the bridge has broadcast, whether
   it navigates onward itself or MSAL completes the return on the next portal load is not
   stated in either source. Read the redirect-bridge how-to before writing bootstrap code.
   → topic `msal-instance-and-bootstrap`.
2. **`navigateToLoginRequestUrl: false` in `auth` config is invalid in v5.** Mechanism
   decided in `0008` — the continuation record owns return navigation, and the option, if
   used, is passed to `handleRedirectPromise`. The config-shape fix and its test are still
   to be written. → topic `msal-instance-and-bootstrap`, comparison §7.3.
3. **Pack leaks raw `AccountInfo` to children.** Pack-internal contradiction; still worth
   carrying because the redacted `AuthenticatedUser` shape is the better model.
   → topic `account-resolution`.
4. **Pack renders `error.message`.** Under v5 that string is a docs URL. Same problem in
   its `loggerCallback`, since v5 console messages are hashed. The independent approach
   already handles this correctly. → topic `observability`.
5. **Neither source implements CAE.** No `clientCapabilities: ["cp1"]`, no
   `WWW-Authenticate` parsing on 401. → topic `cae-and-claims-challenge`.
6. **24-hour SPA refresh-token wall.** Now an accepted consequence of `0003`; the
   mitigation (continuation record, return to exact route) still has to be specified.
   → topic `token-lifetime-24h`.
7. **Soft token boundary.** `0004` stops child0 from *receiving* child1's catalog but
   nothing stops child0's bundle from requesting a `child1-api` token. Enforcement is
   backend audience validation plus per-app adapters plus tests. → topic `authorized-http`.
8. **`localStorage` encryption caveat unmentioned in both.** MSAL skips the AES-GCM
   encryption when the user selects "Keep me signed in". → topic `cache-and-storage`.
9. **Version pins unverified.** React `19.2.8`, TypeScript `7.0.2`, Vite `8.1.5`, React
   Router `8.3.0`, `@azure/msal-react@5.5.3`, and the nginx `add_header_inherit merge` /
   1.29.3 requirement were never checked against upstream. → topic `version-baseline`.
10. **Portal backend dependency.** `0005` requires a `canLaunch` endpoint that exists in
    neither source's backend scope. Needs an owner. → topic `authorization-layers`.
11. **Shared chrome undecided.** Full-page navigation means no persistent nav bar; whether
    chrome is packaged, duplicated, or omitted is open. → topic `workspace-and-packages`.
12. **Unverified: msal-browser version skew between the bridge and an application.** They
    communicate over a `BroadcastChannel`; interoperability across versions is undocumented
    in both sources. Mitigated by one repo-wide pin. → topic `version-baseline`.
13. **Bridge timeout values not chosen.** Defaults unverified; the right value depends on
    authority latency. → topic `msal-instance-and-bootstrap`.
14. **401 retry is a no-op as written.** The independent approach's §16.5 "retry once"
    repeats `acquireTokenSilent`, which returns the same cached token without
    `forceRefresh: true` or a claims challenge. → topic `authorized-http`, comparison §7.5.
15. **Single-origin dev mechanism unchosen.** `0010` fixes the constraint, not the tool.
    → topic `workspace-and-packages`.

Resolved since the last update: the topology fork, the BFF question, and the missing
redirect bridge — formerly the blocking item, now settled by `0007`–`0010`. Cross-tab
logout (formerly item 8) has a chosen mechanism in `0006`; only its detail remains, under
topic 10.

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
