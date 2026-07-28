# State

Last updated: 2026-07-28.

## Where things stand

Workspace created. Both source architectures read in full and compared
(`../analysis/02-approach-comparison.md`). Microsoft guidance researched and recorded
(`../analysis/01-microsoft-guidance-review.md`).

**Zero architecture topics curated yet.** Every entry in `../curated/MANIFEST.md` is
`not-started`.

## Blocking decision

**`topology` must be decided first.** The two sources are mutually exclusive:

- App-shell pack: one document, one MSAL instance, children `import()`ed and mounted
  into the shell's DOM, `/child0/*` serves the shell HTML.
- Independent approach: three documents, one MSAL instance each, full-page navigation,
  `/child0/*` serves child0's own HTML, state shared via the same-origin MSAL cache.

Almost every other topic inherits from this choice. Do not curate
`msal-instance-and-bootstrap`, `routing-and-deep-links`, `cross-tab-and-logout`, or
`workspace-and-packages` before it is settled.

A third option exists and has not been ruled out: Microsoft's BFF / token-handler
pattern (Option C), which removes MSAL from the browser entirely. See the
`bff-alternative` topic. It is the security-preferred option and it also removes the
24-hour SPA refresh-token limit. The independent approach lists it as a non-goal; that
was its author's call, not ours.

## Next up

1. `topology` — the fork. Blocks most others.
2. `bff-alternative` — decide before `topology` is finalised, since a yes here makes the
   fork moot.
3. `redirect-bridge` — highest-severity concrete defect found so far (see open item 1).
4. `account-resolution` — the independent approach's model is clearly better; likely a
   quick settle.
5. `token-acquisition` — depends on 3 and 4.

## Open items carried in

Established during analysis, not yet decided.

1. **MSAL v5 redirect bridge missing from the independent approach.** Its
   `/auth/callback` is a routed portal page; v5 requires a dedicated bridge page calling
   `broadcastResponseToMainFrame()`, with no router, no `MsalProvider`, no COOP header.
   All flows including `acquireTokenSilent` route through it, so every child depends on a
   bridge the plan never defines. Blocking for that topology.
   → topic `redirect-bridge`, comparison §7.1–§7.2.
2. **`navigateToLoginRequestUrl: false` in `auth` config is invalid in v5.** Moved to
   `handleRedirectPromise` options. The independent approach's §7 config block is
   v4-shaped. → topic `msal-instance-and-bootstrap`, comparison §7.3.
3. **Pack leaks raw `AccountInfo` to children.** `01-target-architecture.md` specifies a
   redacted `AuthenticatedUser`; `06-shell-bootstrap-and-providers.md` stores raw
   `AccountInfo`, which carries `idTokenClaims`. The pack contradicts its own boundary.
   → topic `account-resolution`.
4. **Pack renders `error.message`.** Under v5 that string is a docs URL. Same problem in
   its `loggerCallback`, since v5 console messages are hashed. The independent approach
   already handles this correctly. → topic `observability`.
5. **Neither source implements CAE.** No `clientCapabilities: ["cp1"]`, no
   `WWW-Authenticate` parsing on 401. → topic `cae-and-claims-challenge`.
6. **24-hour SPA refresh-token wall unplanned in both.** The independent approach absorbs
   it more gracefully by accident, via its return-path continuation record.
   → topic `token-lifetime-24h`.
7. **No portal entitlement concept in the independent approach.** It has no answer to
   "may this user launch child1" — only a silent-token readiness check. The pack has a
   real `canLaunch` endpoint. → topic `authorization-layers`.
8. **Independent approach has no cross-tab logout mechanism.** E2E scenario 9 asserts the
   behaviour; nothing implements it. → topic `cross-tab-and-logout`.
9. **Soft token boundary in the independent approach.** Children pass `resource` as an
   argument, so child0 can request a child1 token. `assertSingleResourceScopes` blocks
   mixing, not choosing. Its §6.1 example also ships both resource catalogs into child0.
   → topic `authorized-http`.
10. **Version pins unverified.** React `19.2.8`, TypeScript `7.0.2`, Vite `8.1.5`, React
    Router `8.3.0`, `@azure/msal-react@5.5.3`, and the nginx `add_header_inherit merge` /
    1.29.3 requirement were never checked against upstream.
    → topic `version-baseline`.
11. **`localStorage` encryption caveat unmentioned in both.** MSAL skips the AES-GCM
    encryption when the user selects "Keep me signed in". → topic `cache-and-storage`.

## Decisions so far

| # | Topic | Decision |
|---|---|---|
| 0001 | workspace | Curation workspace structure adopted |
