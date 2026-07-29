# 0005 — Port the portal launch-entitlement check

Status: accepted
Superseded-by: 0030
Date: 2026-07-28
Topic: authorization-layers (decided during `topology`)

## Context

The app-shell pack has a portal entitlement layer: `GET /api/portal/v1/me/applications/child0`
returns whether the account may launch that application, a guarded route enforces it, and a
`/access-denied` route handles the negative case. The independent approach has no
"may this user launch child0" concept at all. Its portal performs a silent token
acquisition as a *readiness* check; an unentitled user simply navigates to `/child0/` and
collects a 403 from the child API (`analysis/02-approach-comparison.md` §6.1).

Decision `0002` chose the independent topology, so this capability is absent unless
deliberately ported.

## Options

1. **Port it** — portal API `canLaunch` endpoint plus a launch guard before navigation.
2. **Do not port** — entitlement enforced solely by each child API returning 403.

## Decision

Option 1. The portal asks its own API whether the current account may launch a given
application before navigating to it, and shows a denial route when the answer is no.
A silent token acquisition is a readiness check and must never be used as an entitlement
check.

## Why

The user's call. Without it there is no launch-time signal: the user reaches a child
application, it boots, resolves an account, requests a token, calls its API, and only then
discovers it may not be there. That is a bad experience and it also makes the portal unable
to render an accurate application list.

Note the interaction with `0002`: under navigational composition the guard is weaker than
the pack's, because navigating to `/child0/` is a plain URL the user can type. The guard
prevents the portal from *offering* a launch; it cannot prevent the navigation. That is
acceptable — the guard is UX, and the child API is the authority.

## Rejected because

- **403-only** — correct on security, silent on UX, and leaves the portal with no basis
  for deciding what to show. Also conflates "not entitled" with "misconfigured API".

## Evidence

- `sources/app-shell-pack/10-portal-and-child-authorization.md`.
- `sources/independent/independent-approach.md` §16.6, §17.
- `analysis/02-approach-comparison.md` §6.1.

## Consequences

- Requires a portal backend endpoint that does not exist in the independent source. That
  is backend work outside this frontend architecture, and it must be flagged as a
  dependency.
- Topic 12 (`authorization-layers`) must define the endpoint shape, the guard, the denial
  route, and the caching/staleness rule for the answer.
- Frontend permission checks remain UX. The child API stays authoritative and must return
  403 for an unentitled account regardless of what the portal decided.
- The entitlement response must carry no PII beyond what the portal already displays.

## Open

- Whether entitlement is per application only, or per application plus feature. Deferred to
  topic 12.
- How a launch decision is refreshed when entitlement changes mid-session. Deferred to
  topic 12.
