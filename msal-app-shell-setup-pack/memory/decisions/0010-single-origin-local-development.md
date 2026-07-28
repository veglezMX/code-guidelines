# 0010 — Local development is served from a single origin

Status: accepted
Date: 2026-07-28
Topic: redirect-bridge (inherited by `workspace-and-packages`, `entra-registration`)

## Context

Decision `0002` makes the same-origin MSAL cache the *only* channel through which the three
applications share authentication state, and `0007` registers one exact-match redirect URI
per environment.

The natural development setup for three independently built SPAs is three Vite dev servers
on three ports. Three ports are three origins. Neither source addresses this: the pack has
one application and one dev server, and the independent approach's §3.3 deployment
assumptions speak about production routing only.

## Options

1. **Single dev origin.** One local port fronts portal, child0, child1 and the bridge,
   mirroring the production route map.
2. **Per-app dev servers**, one redirect URI registered per port in the development Entra
   registration.

## Decision

Option 1. Local development is served from one origin with the production route map,
including `/auth-redirect.html` with no COOP header and `no-store`, and one development
redirect URI.

The mechanism — a dev proxy in front of the three Vite servers, one Vite server with
multiple inputs, or a local nginx running the real configuration — is topic 16's to choose.
The single-origin constraint is fixed here.

## Why

On separate ports the architecture under test is not the architecture that ships. The
shared MSAL cache does not span origins, so cross-application SSO and the cross-tab logout
signal from `0006` cannot be exercised at all, and the first place the difference appears
is a deployed environment. That is the most expensive place to find it.

It also keeps `0007`'s registration story intact: one bridge URI per environment rather
than one per port, avoiding a class of exact-match mistake that only manifests at runtime as
`redirect_uri_mismatch`.

What would have changed the answer: nothing available — the alternative cannot test the
mechanism the topology is built on.

## Rejected because

- **Per-app dev servers on separate ports** — faster to start, but they are three origins:
  no shared cache, no cross-app SSO, no cross-tab logout, plus a redirect URI per port in
  the development registration.

## Evidence

- `curated/topology.md` invariant 4 and decision `0002` (cache sharing requires identical
  origin).
- `sources/independent/independent-approach.md` §3.3.
- `analysis/01-microsoft-guidance-review.md` §1 (`localStorage` is what lets tabs share the
  MSAL cache; redirect URI must match exactly).

## Consequences

- Topic 16 (`workspace-and-packages`) must specify the single-origin dev mechanism and a
  `just`-style entry point that starts it.
- Topic 3 (`entra-registration`) registers one development redirect URI on the single dev
  origin.
- Topic 19 (`testing`) can run the E2E scenarios — including cross-tab logout, E2E 9 — 
  locally, which was not possible under the alternative.
- The dev origin should also carry the production security headers, including the COOP
  exception for the bridge, or local development will not reproduce header-related
  failures.

## Open

Which mechanism, and whether the dev origin serves the real nginx configuration or an
approximation. → topic 16.
