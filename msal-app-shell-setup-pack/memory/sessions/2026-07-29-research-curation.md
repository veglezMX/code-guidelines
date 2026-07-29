# 2026-07-29 — Research curation

Topics: `msal-instance-and-bootstrap` (4), `redirect-bridge` (5 refinement), and
`version-baseline` (20). All settled.

## Covered

- Curated the verified parts of `research.md` into the three-topic session limit.
- Re-checked the v5 migration/bridge/React-provider claims against Microsoft documentation,
  current source, and the exact published `@azure/msal-browser@5.17.3` package.
- Queried npm immediately before writing the baseline; `@azure/msal-react` had advanced
  from the research's `5.5.3` to `5.5.4`.
- Appended corrections to `analysis/01`; sources remain untouched.

## Decided

- `0011` — one initialized PCA per document; portal handles the redirect before render;
  all apps use `MsalProvider`; no mirrored auth store or second PCA.
- `0012` — explicit initial bridge timeouts: iframe `10_000` ms, popup `60_000` ms.
- `0013` — one exact compatible dependency baseline and one physical MSAL resolution.

## Resolved

- The standard v5 factory initializes but does not process redirects.
- Full-page bridge responses are cached in MSAL temporary `sessionStorage`, then consumed
  on the initiating page; cache failure can yield `null`.
- `MsalProvider` internally calls `handleRedirectPromise` in every app, refining "portal
  only" to the application-owned pre-render call.
- nginx `add_header_inherit merge` requires `1.29.3+`.

## Deferred / still missing

- Fifteen manifest topics remain, starting with account resolution and Entra registration.
- `research.md`'s advice to route `timed_out` to the portal conflicts with accepted `0009`;
  preserved as an explicit open item rather than silently superseding the decision.
- Registry/peer compatibility is verified; implementation build and browser proof are not.
