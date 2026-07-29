# 0013 — Pin one exact, compatible frontend and MSAL baseline

Status: accepted
Date: 2026-07-29
Topic: version-baseline

## Context

The received pack lists exact versions but analysis `01`/`02` had not verified them.
`research.md` verified most of the July 2026 set and recommended a known v5 pair, but its
`@azure/msal-react@5.5.3` observation was already stale at curation time.

Direct registry queries on 2026-07-29 found:

- `@azure/msal-browser@5.17.3`;
- `@azure/msal-react@5.5.4`, whose peer floor is browser `^5.17.3`;
- React/DOM `19.2.8`, React Router `8.3.0`, Vite `8.1.5`,
  `@vitejs/plugin-react@6.0.4`, TypeScript `7.0.2`, and pnpm `11.18.0`.

React Router requires Node `>=22.22.0`. Official nginx documentation confirms
`add_header_inherit` appeared in `1.29.3`; nginx currently offers stable `1.30.4` and
mainline `1.31.3`.

The bridge is compiled from the browser package and communicates with applications through
MSAL-owned temporary storage and channels. No primary source promises interoperability
between patch-skewed copies.

## Options

1. **Exact compatible set, one physical MSAL copy** — controlled lockfile updates.
2. **Floating semver ranges** — each application can resolve newer patches independently.
3. **Keep the received pack pins indefinitely** — avoid change despite newer compatible
   releases.

## Decision

Option 1, with the table in `curated/version-baseline.md`. Pin exact external versions,
pin `packageManager: pnpm@11.18.0`, require Node `>=22.22.0`, and fail CI on duplicate or
version-skewed MSAL resolutions.

## Why

The exact set is reproducible and the wrapper/browser peer relationship is verified.
Using one browser build across portal, children, and bridge removes an undocumented
compatibility variable from the architecture's most sensitive hand-off.

The update policy remains controlled rather than frozen: query the registry, check peer
ranges and engines, update together, run the browser matrix, then roll out portal first.

What would change the answer: an upstream compatibility guarantee for mixed patch versions
could relax the single-patch rule, but not the one-copy rule or controlled updates.

## Rejected because

- **Floating ranges** — can change production output without architecture review and can
  skew the bridge from a child.
- **Permanent old pins** — trades reproducibility for known staleness; the current React
  wrapper requires the newer browser patch.

## Evidence

- npm registry queries on 2026-07-29 for every version and engine/peer range in the curated
  table.
- [MSAL.js repository version policy](https://github.com/AzureAD/microsoft-authentication-library-for-js):
  semantic versioning and current-version updates are recommended.
- [React CVE-2025-55182 advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components):
  affected RSC packages and fixed 19.2 floor.
- [nginx headers module](https://nginx.org/en/docs/http/ngx_http_headers_module.html):
  `add_header_inherit` appeared in `1.29.3`.
- [nginx downloads](https://nginx.org/en/download.html): current stable/mainline versions.
- `research.md` version and migration sections.

## Consequences

- Topic 16 must implement workspace overrides/deduplication and exact package-manager
  metadata.
- Topic 19 must provide integration proof before the baseline is called runtime-verified.
- Portal deploys first on MSAL upgrades because it owns the shared bridge.
- MSAL's five-day old-cache retention default becomes part of rollback planning; topic 13
  may deliberately change it.

## Open

Exact Node and nginx container image digests depend on the deployment repository.
