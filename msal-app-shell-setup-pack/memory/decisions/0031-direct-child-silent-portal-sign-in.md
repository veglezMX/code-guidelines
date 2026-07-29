# 0031 — Make direct child entry a silent-first portal sign-in flow

Status: accepted
Date: 2026-07-29
Topic: interaction-recovery
Refines: 0011, 0016, 0021, 0024

## Context

A user may enter a child route directly, for example
`/child0/projects/123?view=history`, with no account in the shared MSAL cache. The child
must not invoke interactive MSAL APIs, but redirecting the user to the portal must not
discard the selected child route.

The shared tenant ID, SPA client ID, authority, origin, and cache configuration allow the
portal to see an account already cached by any of the three SPAs. When no account is
cached, an existing Microsoft Entra session may still permit silent SSO.

## Decision

The child validates and stores its exact current route in the tab-local continuation,
sets `action: "sign-in"` and `automaticSignInAttempted: false`, then replaces the document
with `/auth/continue`. It does not render protected routes, call its backend, call
`ssoSilent`, or invoke an interactive MSAL API.

The portal processes the continuation in this order:

1. Handle any redirect result and recheck the shared MSAL cache.
2. If an account exists, finish the continuation immediately.
3. Otherwise atomically set `automaticSignInAttempted: true` and call portal-owned
   `ssoSilent` as an authentication-only request, without a child API resource scope.
4. If silent SSO succeeds, set the returned account active and finish the continuation.
5. If silent SSO requires interaction or cannot select one of multiple Entra sessions,
   automatically start portal-owned `loginRedirect`.
6. After successful redirect handling, validate and delete the continuation, then replace
   the portal document with the exact validated child route.
7. If the portal sees `automaticSignInAttempted: true` without a successful account or
   redirect result, stop on stable recovery. Never begin another automatic cycle.

The original direct navigation is foreground sign-in intent, so no intermediate Continue
button is required. This is narrower than background/API recovery under `0021`, which
still requires explicit user action before an interactive redirect.

## Why

This gives direct links the same portal-owned authentication behavior as portal
navigation while preserving independent child documents and keeping all interaction out
of child applications.

`ssoSilent` is best-effort. It can reuse an existing Entra session without a cached MSAL
account, but it may fail when there is no server session, when multiple accounts are
available, or when browser privacy controls block the hidden iframe. Those outcomes
require portal-owned interaction or recovery; they cannot be made silent by application
code.

## Rejected

- Interactive login from the child, because sign-in and redirect handling belong to the
  portal.
- Put the return URL in the query string, because URLs are logged and expand the
  open-redirect surface.
- Render the child and wait for its API to return `401`, because protected loaders would
  run before authentication and the deep-link hand-off would occur too late.
- Retry automatic silent/interactive sign-in indefinitely, because a missing session,
  blocked iframe, cancelled login, or configuration error would create a loop.
- Require a Continue click for initial direct navigation, because the navigation itself
  is foreground user intent; the button remains required for background/API recovery.

## Evidence

- [Microsoft: sign in users with MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/login-user).
- [Microsoft: prompt behavior and silent-request failures](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/prompt-behavior).
- [Microsoft: MSAL.js single sign-on](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-sso).

## Consequences

- Continuation validation includes the boolean automatic-attempt marker and enforces its
  valid action combinations.
- Portal bootstrap must distinguish redirect success, cached account, silent SSO
  success, interaction-required, multiple-account, bridge, transient, and terminal
  outcomes.
- Browser tests cover direct deep links with a cached account, one Entra session, no
  Entra session, multiple Entra sessions, blocked silent iframe, cancellation, and exact
  return-path restoration.
