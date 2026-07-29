# 0012 — Start with explicit v5 default bridge timeouts

Status: accepted
Date: 2026-07-29
Topic: msal-instance-and-bootstrap

## Context

Decision `0009` requires explicit `iframeBridgeTimeout` and `popupBridgeTimeout` values but
left the values open because neither source verified the defaults. `research.md` identified
the current v5 defaults, and the MSAL repository's current configuration reference states
`10_000` ms for hidden iframes and `60_000` ms for popups.

No tenant latency measurements exist yet. A starting value is still required so all three
applications have identical, testable behavior.

## Options

1. **Set the documented defaults explicitly** — iframe `10_000`, popup `60_000`.
2. **Choose larger speculative values** — tolerate slower authorities without evidence.
3. **Omit the fields** — inherit library defaults.

## Decision

Option 1. The shared runtime auth block supplies:

```ts
system: {
  iframeBridgeTimeout: 10_000,
  popupBridgeTimeout: 60_000,
}
```

All three application keys receive the same values. A change is an operational tuning
decision backed by latency and timeout telemetry, not an ad hoc per-app override.

## Why

Explicit defaults make config validation, tests, telemetry thresholds, and incident
comparison deterministic without pretending to have tenant-specific evidence.

The iframe path is the important child path and should fail fast enough to present a retry
rather than leave a route indefinitely blocked. Popup behavior is portal-only and keeps
the library's longer user-interaction allowance.

What would change the answer: measured high-percentile authority latency close to either
limit, or a documented accessibility requirement for longer popup completion.

## Rejected because

- **Speculative increases** — hide bridge/header defects for longer and have no measured
  basis.
- **Implicit defaults** — behavior can drift on a library update and cannot be asserted
  from runtime config.

## Evidence

- [MSAL Browser configuration reference](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md):
  `iframeBridgeTimeout` default `10000`; `popupBridgeTimeout` default `60000`.
- [MSAL Browser v4→v5 migration](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration):
  the two bridge options replace the old hash timeouts and govern BroadcastChannel waits.
- `research.md` §1 "Bridge timeout config".

## Consequences

- `0009`'s `bridge-unavailable` classification is unchanged.
- Topic 18 must emit duration and stable error code so the values can be tuned later.
- Topic 19 must test just-below and at/above timeout behavior with fake timers.

## Open

Production tuning awaits real authority-latency data.
