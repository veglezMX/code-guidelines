# 0004 — One `/portal-runtime.json`, keyed by application, each app reads only its key

Status: accepted
Date: 2026-07-28
Topic: topology (inherited by `msal-instance-and-bootstrap`, `workspace-and-packages`)

## Context

Both sources agree runtime configuration must be injected and validated at runtime rather
than baked in at build time (`analysis/02-approach-comparison.md` §4). They disagree on
delivery. The app-shell pack fetches one `/runtime-config.json` with `cache: no-store` and
a hand-written validator, because there is only one document. The independent approach
requires each application to inject its own configuration and forbids the shared auth
package from reading `import.meta.env` (§6, §7) — but its §6.1 example ships **both**
resource catalogs into child0, which is the leak recorded in comparison §6.3.

Under decision `0002` there are three documents, so "the config endpoint" now has to
answer which application is asking.

## Options

1. **One endpoint keyed by application id; each document reads only its own key.**
2. **Edge filters by requester** — `/child0/runtime.json`, or a query parameter, with
   nginx/APIM returning only the caller's slice.
3. **One flat document consumed identically by all three.**

## Decision

Option 1. `GET /portal-runtime.json` returns an object whose top level is keyed by
application id (`portal`, `child0`, `child1`). Each document reads `config[myApplicationId]`
and nothing else, validates it, and fails startup hard if validation fails. Served
`Cache-Control: no-store`. Contains no secrets. The `auth` block — `clientId`, `authority`,
`cache` — must be identical across keys, served from one source of truth.

## Why

The user specified the shared endpoint. Keying it by application is what makes that
compatible with the independent approach's per-application configuration rule: the package
still receives injected configuration and still never reads the environment; only the
transport is shared.

Per-application keys also fix the independent source's own §6.1 defect at the config layer
— child0's `resources` catalog contains `child0-api` only. That is a real reduction in
accident surface even though it is not a security boundary (see Consequences).

One endpoint means one artifact to deploy, one cache rule, and one place where the
`clientId`/`authority`/`cache` triple is defined — which matters, because decision `0002`
makes divergence in that triple a silent breakage of cross-application state sharing.

What would have changed the answer: a requirement that child0 never *receive* child1's
audience, which would force option 2.

## Rejected because

- **Edge filtering** — genuinely prevents child0 from receiving child1's catalog, but buys
  little: the boundary is soft regardless, because child0's own MSAL instance can request
  any scope string it hard-codes, whether or not it was told the audience. Cost is per-app
  routing config and per-app cache keys in exchange for obscurity, not enforcement.
- **One flat document** — every application ships knowledge of every audience, which is the
  §6.1 leak preserved rather than fixed.

## Evidence

- `sources/app-shell-pack/04-install-and-runtime-config.md` (single `/runtime-config.json`,
  `no-store`, hand-written validator).
- `sources/independent/independent-approach.md` §6, §6.1, §7.
- `analysis/02-approach-comparison.md` §4, §6.3.

## Consequences

- Topic 4 (`msal-instance-and-bootstrap`) inherits the load-and-validate step and must
  define the validator and the failure behaviour.
- Topic 16 (`workspace-and-packages`) must keep the shared auth package free of
  environment reads; configuration arrives as an argument.
- Topic 17 (`nginx-and-headers`) must serve `/portal-runtime.json` with `no-store` and
  must not let it be cached by an intermediary.
- The endpoint is publicly readable by anything on the origin. Nothing beyond client IDs,
  authorities, scope URIs, and API base paths may go in it. This is now a review rule.
- Reading another application's key is a defect; worth a unit test per application.

## Open

- The name `/portal-runtime.json` describes the portal but serves all three applications.
  Kept as specified; rename only if a later consumer makes it actively misleading.
- Per-environment delivery (dev/test/prod) of the same document is unspecified. → topic
  `version-baseline` (20) or a deployment topic if one is added.
