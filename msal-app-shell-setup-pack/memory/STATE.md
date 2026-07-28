# State

Last updated: 2026-07-28.

## Where things stand

Workspace created. Both source architectures read in full and compared
(`../analysis/02-approach-comparison.md`). Microsoft guidance researched and recorded
(`../analysis/01-microsoft-guidance-review.md`).

**The fork is settled.** `topology` (1) and `bff-alternative` (2) are both `settled`.
The architecture is **three independently deployed SPAs on one origin, composed by
navigation, with MSAL in the browser** — see `../curated/topology.md`. Everything else is
still `not-started`.

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

## Blocking now

**`redirect-bridge` (topic 5).** Under the chosen topology the independent source's
`/auth/callback` — a routed portal page — does not work against `@azure/msal-browser@5`.
A dedicated bridge document is required: no router, no `MsalProvider`, its own COOP
handling, calling `broadcastResponseToMainFrame()`. Every flow including
`acquireTokenSilent` routes through it, so no token topic can be finished before it.

## Next up

1. `redirect-bridge` — blocking, and the highest-severity concrete defect found.
2. `msal-instance-and-bootstrap` — now unblocked; also fixes the invalid
   `navigateToLoginRequestUrl` placement (open item 2) and defines the
   `/portal-runtime.json` loader and validator.
3. `account-resolution` — the independent approach's model is clearly better; likely a
   quick settle.
4. `entra-registration` — one shared SPA registration plus per-backend API registrations,
   already implied by `0002`.
5. `token-acquisition` — depends on 1 and 3.

## Open items carried in

Established during analysis or during the topology session, not yet decided.

1. **MSAL v5 redirect bridge missing from the independent approach.** Now definitely in
   scope — see "Blocking now". → topic `redirect-bridge`, comparison §7.1–§7.2, §7.4.
2. **`navigateToLoginRequestUrl: false` in `auth` config is invalid in v5.** Moved to
   `handleRedirectPromise` options. The independent approach's §7 config block is
   v4-shaped. → topic `msal-instance-and-bootstrap`, comparison §7.3.
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

Resolved since the last update: the topology fork itself, and the BFF question (items
formerly listed as the blocking decision). Cross-tab logout (formerly item 8) has a chosen
mechanism in `0006`; only its detail remains, under topic 10.

## Decisions so far

| # | Topic | Decision |
|---|---|---|
| 0001 | workspace | Curation workspace structure adopted |
| 0002 | topology | Navigational composition, one document and one MSAL instance per app |
| 0003 | bff-alternative | MSAL stays in the browser; BFF / token handler rejected |
| 0004 | topology | One `/portal-runtime.json` keyed by app; each app reads only its key |
| 0005 | authorization-layers | Port the portal launch-entitlement check |
| 0006 | cross-tab-and-logout | Port the payload-free `BroadcastChannel` logout signal |
