# 0007 — One portal-owned redirect bridge document, shared by all three applications

Status: accepted
Date: 2026-07-28
Topic: redirect-bridge

## Context

`analysis/01-microsoft-guidance-review.md` §1 verified against Microsoft's documentation
that MSAL Browser v5 requires a dedicated redirect bridge page; that the page must call
`broadcastResponseToMainFrame()` and nothing else; that it must not receive a COOP header;
and that the redirect URI must match the registration exactly. The same review's
recommendation 10 records a further Microsoft constraint: the bridge page and its assets
must not be served from a third-party CDN, because the bridge receives raw authorization
codes and tokens.

The app-shell pack implements this correctly (`05-msal-v5-redirect-bridge.md`), for one
document. The independent approach does not implement it at all: its §15.3 makes
`/auth/callback` a portal SPA route that bootstraps MSAL and calls
`handleRedirectPromise` — the v4 shape (`analysis/02` §7.1). Decision `0002` chose the
independent topology, so the pack's bridge has to be carried across to three documents,
and a new question appears: which application owns the bridge.

A second point from `analysis/02` §7.2: children are affected even though they are
silent-only, because in v5 the `acquireTokenSilent` iframe path also routes through the
bridge.

## Options

1. **Portal ships one bridge**, all three applications point `redirectUri` at it, one
   redirect URI registered per environment.
2. **A standalone bridge artifact** owned by no application, deployed on its own.
3. **A bridge per application**, three redirect URIs registered per environment.

## Decision

Option 1.

- `/auth-redirect.html` lives in the portal build (`apps/portal/auth-redirect.html` plus
  `apps/portal/src/auth/redirect-bridge.ts`), declared as a second Vite entry.
- All three applications use it as `redirectUri`, supplied through the shared `auth` block
  of `/portal-runtime.json` (`0004`), so the value is identical everywhere by construction.
- `/auth/callback` is deleted. `/auth/continue` is unchanged.
- Only the portal calls `handleRedirectPromise`, once, at bootstrap, before render.
- The bridge is served with no COOP header, `Cache-Control: no-store`, from an exact-match
  location, same-origin assets only.

## Why

The user's call, and the least machinery for the same result. One registered redirect URI
per environment instead of three is a real operational saving — redirect URIs are edited by
hand in Entra, per environment, and each extra one is an opportunity for an exact-match
mistake that manifests as `redirect_uri_mismatch` at runtime.

Sharing is safe because the bridge is same-origin for all three applications by the
topology invariant, carries no application state, and is not application-specific: it
broadcasts whatever response it receives back to the main frame.

Deleting `/auth/callback` rather than keeping it as a landing route reflects that under v5
it has no job. Keeping a second auth-shaped path invites someone to point a registration or
a bookmark at it later, and it would be a path that silently does nothing.

What would have changed the answer: children needing to ship authentication changes on
their own cadence, which would force option 2.

## Rejected because

- **Standalone bridge artifact** — genuinely removes the portal coupling and makes the
  msal-browser pin explicit, but adds a fourth build, version and deploy for one HTML file
  and one function call. Reconsider if release cadences diverge.
- **Per-app bridges** — three copies to keep synchronised and three exact-match URIs per
  environment, in exchange for deploy independence on a file that changes approximately
  never.
- **`/auth/callback` kept as a demoted landing route** — see Why.

## Evidence

- Verified in `analysis/01-microsoft-guidance-review.md` §1: bridge required, must call
  `broadcastResponseToMainFrame()` only, must not receive COOP, Vite two-entry pattern,
  exact redirect URI match. Recommendation 10: no third-party CDN.
- [Set up the redirect bridge page in MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge)
  and [Migrate from MSAL Browser v4 to v5](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration),
  as summarised in that review. **Pages not re-fetched in this session.**
- `sources/app-shell-pack/05-msal-v5-redirect-bridge.md`, `00-version-baseline.md`,
  `11-nginx-full-configuration.md`.
- `sources/independent/independent-approach.md` §15.1, §15.3.
- `analysis/02-approach-comparison.md` §7.1, §7.2.

## Consequences

- Children depend on a portal deploy for any bridge change. Accepted.
- Topic 3 (`entra-registration`): one SPA redirect URI per environment, exact match.
- Topic 4 (`msal-instance-and-bootstrap`): portal bootstrap owns the single
  `handleRedirectPromise` call; children must not call it; every application's config
  carries the bridge `redirectUri`.
- Topic 17 (`nginx-and-headers`): exact-match `location = /auth-redirect.html`, COOP
  suppressed by the empty-value `map`, `no-store`, and the path must not be caught by any
  application's history fallback.
- Topic 16 (`workspace-and-packages`): the portal build has two Vite entries.
- The bridge and its assets must stay same-origin. This is a review rule; a later "move
  static assets to a CDN" change must exclude it.

## Open

Full-page-redirect hand-off (who navigates onward once the bridge has broadcast) is
unverified — recorded in `curated/redirect-bridge.md` §Open item 1. It does not change this
decision.
