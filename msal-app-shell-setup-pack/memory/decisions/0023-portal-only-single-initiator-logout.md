# 0023 — Make logout portal-only and single-initiator

Status: accepted
Date: 2026-07-29
Topic: cross-tab-and-logout

## Context

The accepted BroadcastChannel decision specifies one initiator but left channel scope,
receiver behavior, degraded fallback, and the concrete MSAL logout flow open.

## Decision

Children navigate to portal `/logout`. The portal broadcasts, clears account-bound
application memory, and alone calls `logoutRedirect` to the registered MSAL-free
`/signed-out` page. Receivers block protected UI and clear memory but never log out or
navigate. Channel messages cover logout/session invalidation only.

When BroadcastChannel is unavailable, rely on MSAL account events and browser lifecycle
re-resolution rather than adding an application localStorage bus.

## Why

It prevents redirect races, converges idle documents promptly on supported browsers, and
keeps the synchronization message free of identity data.

## Rejected

- Logout from every tab or child.
- Account/login data on the channel.
- Application localStorage event marker.
- Popup logout baseline.
- Treat local cache clear as proof of server-session termination.

## Evidence

- [MSAL logout](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/logout).
- [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).

## Consequences

The portal owns `/logout` and `/signed-out`. Browser tests must cover multi-tab, channel
absence, network failure, and active/multiple-account cases.
