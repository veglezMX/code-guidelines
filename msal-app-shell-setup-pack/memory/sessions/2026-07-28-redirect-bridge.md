# 2026-07-28 — Redirect bridge

Topic: `redirect-bridge` (5). Settled. Same day as the topology session, after it.

## Covered

- Loaded the MANIFEST slice: pack `00` "Important MSAL v5 changes", pack `05`, pack `11`
  bridge block; independent §12, §15.1–§15.4; analysis `01` §1, §2.5 and recommendation 10;
  analysis `02` §7.1–§7.4.
- Confirmed from analysis `01` §1 that the bridge requirement, the
  `broadcastResponseToMainFrame()`-only rule, the no-COOP rule, the Vite two-entry pattern
  and exact redirect-URI matching are all verified against Microsoft documentation, and
  that the bridge and its assets must never be served from a third-party CDN.
- Surfaced a consequence neither source states: under `0002`, three dev servers on three
  ports are three origins, so local development cannot exercise the shared cache at all.
- Wrote `curated/redirect-bridge.md`.

## Decided

- `0007` — one portal-owned `/auth-redirect.html`, shared by all three applications as
  `redirectUri`, one Entra URI per environment. `/auth/callback` deleted. Portal alone
  calls `handleRedirectPromise`; all three configs carry the bridge URI because the v5
  silent-iframe path goes through it.
- `0008` — the continuation record owns return navigation; `navigateToLoginRequestUrl`
  belongs to `handleRedirectPromise`, not `auth` config.
- `0009` — a bridge timeout is a distinct non-interactive failure, never
  `interaction-required`, because the portal-redirect response would loop against a bridge
  that will not load.
- `0010` — local development is single-origin, mirroring the production route map.

## Deferred

- Bridge timeout values, the single `handleRedirectPromise` call site, and the config-shape
  test → topic 4.
- Naming and placement of the `bridge-unavailable` outcome in the result union → topic 7.
- Dev-origin mechanism (proxy, single Vite server, or local nginx) → topic 16.
- nginx exact-match location, COOP map and `no-store` → topic 17.

## Unverified, carried forward

- Who navigates after a full-page redirect once the bridge has broadcast. Does not change
  any decision; must be read from the redirect-bridge how-to before bootstrap code.
- Whether a version-skewed bridge and application interoperate over the `BroadcastChannel`.
- Default bridge timeout values.

## Next session

`msal-instance-and-bootstrap` (4). It owns every loose end above, plus the
`/portal-runtime.json` loader and validator from `0004`.
