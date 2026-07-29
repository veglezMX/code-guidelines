# 0011 — Bootstrap once before render; MSAL context remains the state source

Status: accepted
Date: 2026-07-29
Topic: msal-instance-and-bootstrap

## Context

The pack creates an initialized v5 PCA correctly, but then mirrors `AccountInfo` and
authentication status into a custom external store. The independent approach keeps client
creation outside redirect processing but does not settle React state ownership.
`research.md` recommends `MsalProvider` plus MSAL hooks and one stable instance, and the
official `MsalProvider` source shows that it registers its own event callback and calls
`initialize()` followed by `handleRedirectPromise()` in an effect.

Two existing statements needed reconciliation. Decision `0007` says only the portal calls
`handleRedirectPromise`; `MsalProvider` calls it internally in every application. The
architectural rule is therefore about the application-owned redirect-processing step:
only the portal explicitly processes the result before render. The provider's cached,
idempotent internal call is library plumbing; children still initiate no redirect and have
no response to consume.

The earlier analysis also incorrectly implied that
`createStandardPublicClientApplication()` consumes redirect responses. Microsoft's v5
migration guide says it instantiates and initializes a standard PCA; redirect processing
remains a separate `handleRedirectPromise` call.

## Options

1. **Pre-render bootstrap plus `MsalProvider` state** — one instance per document; portal
   explicitly processes redirects; hooks/context read MSAL state.
2. **Pack external store** — mirror account and status state outside MSAL.
3. **Effect-only portal bootstrap** — let `MsalProvider` process the redirect after the
   application has rendered.
4. **Custom child provider** — avoid `MsalProvider` in children solely to prevent its
   harmless internal redirect call.

## Decision

Option 1.

- Each document calls `createStandardPublicClientApplication` exactly once outside React's
  render path.
- The portal calls
  `handleRedirectPromise({ navigateToLoginRequestUrl: false })` before rendering, sets the
  redirect result's account active, then delegates cached-account ambiguity to topic 6.
- Child application code does not call `handleRedirectPromise` or any interactive API.
- All applications render one `MsalProvider`. Its internal repeated initialization and
  redirect calls are accepted because MSAL caches/guards them.
- Components use MSAL hooks/context. There is no mirrored auth store.
- Non-React consumers receive the same instance from the application composition root;
  they do not create a second PCA or import a package-global singleton.

## Why

The portal cannot safely start protected loaders or render authenticated routes before the
redirect result and active account are restored. Pre-processing gives bootstrap a single
explicit completion point.

`MsalProvider` is the official React integration and already derives account and
interaction state from MSAL events. Mirroring those values adds a second consistency
problem and, in the pack's version, exposes raw `AccountInfo` including claims.

A custom child provider would duplicate MSAL React for no operational benefit:
`handleRedirectPromise` on a non-redirect load resolves `null`, and children never start a
redirect whose response could land there.

What would change the answer: a future MSAL React API that lets the caller declare redirect
processing already complete could remove the provider's repeated internal call, but would
not change the pre-render portal step or state ownership.

## Rejected because

- **External store** — duplicates the source of truth and leaks a broader account shape.
- **Effect-only bootstrap** — permits pre-restoration renders and loader races.
- **Custom child provider** — forks official React integration merely to avoid an
  idempotent `null` result.
- **Package-global singleton** — conflicts with the three-document topology and makes test
  isolation and lifecycle ownership ambiguous.

## Evidence

- [MSAL Browser v4→v5 migration](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration):
  `createStandardPublicClientApplication` instantiates and initializes the standard PCA;
  `handleRedirectPromise` has a separate options-object API.
- [MSAL React getting started](https://learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started):
  initialize one PCA and pass it to `MsalProvider`; descendants use its context.
- [MSAL React `MsalProvider` source](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/src/MsalProvider.tsx):
  registers events and invokes `initialize()` / `handleRedirectPromise()`.
- Published `@azure/msal-react@5.5.4`, `src/MsalProvider.tsx`, inspected from the npm
  tarball on 2026-07-29; behavior matches the repository source.
- `research.md` §1, §3, §4.
- Pack `06`; independent §8, §15.1.

## Consequences

- Topic 6 owns multi-account choice; bootstrap may select the sole cached account but not
  an arbitrary one.
- Topic 10 owns logout side effects; topic 18 owns sanitized event logging.
- Tests must prove only one PCA construction per document, portal processing before
  render, a harmless cached provider re-call, and no application-owned child redirect call.
- Decision `0007` is read as "only the portal explicitly processes the redirect result",
  not as a requirement to fork `MsalProvider`.

## Open

Whether account-selection UI renders before or inside the normal application route tree.
→ topic 6.
