# 0008 — The continuation record owns return navigation; `navigateToLoginRequestUrl` is a `handleRedirectPromise` option

Status: accepted
Date: 2026-07-28
Topic: redirect-bridge (inherited by `interaction-recovery`, `msal-instance-and-bootstrap`)

## Context

Two mechanisms can return a user to where they were after an interactive redirect.

MSAL's own: `navigateToLoginRequestUrl` restores the URL that initiated the request. The
independent approach mandates it inside the `auth` configuration object (§7). In v5 that
option was **removed from `BrowserAuthOptions`** and is now an option on
`handleRedirectPromise` (`analysis/02` §7.3). Set in the old place it is silently ignored —
open item 2 in `STATE.md`.

The independent approach's own: a continuation record (§12) persisted in `sessionStorage`
under `workspace.auth.continuation` as `{nonce, action, resource?, returnPath, createdAt}`
with a ~10-minute window, cleared before navigating, carrying navigation intent and never
tokens. Return paths pass `normalizeInternalReturnPath`, which rejects protocol-relative
URLs, backslash confusion, encoded-external variants, `javascript:` and `data:`, falling
back to `/`.

Under `0002` this matters more than it did in either source: a return is frequently to
another *application* (`/child0/projects/123`), not another route of the same one.

## Options

1. **Continuation record owns it.** `navigateToLoginRequestUrl` used only if needed, and
   only as a `handleRedirectPromise` option.
2. **MSAL-native return.** Drop the continuation record, rely on
   `navigateToLoginRequestUrl`.

## Decision

Option 1. The continuation record is the return mechanism. Where
`navigateToLoginRequestUrl` is passed at all it is passed to `handleRedirectPromise`, never
placed in `auth` config.

## Why

The continuation record carries *why* the user was sent to the portal — `action`,
`resource` — not just where they came from. `/auth/continue?action=acquire-token&resource=child0-api&returnUrl=/child0/projects/123`
cannot be expressed by a restored URL. That intent is what lets the portal do the right
interaction and then return the user to the exact child route, which is also the mitigation
for the 24-hour refresh-token wall accepted in `0003`.

It is also more robust: the record does not depend on query parameters surviving a
third-party redirect, it is nonce'd and expiring, and it is cleared before navigation.

The v5 placement fix is not a preference — the v4 placement does nothing.

What would have changed the answer: nothing available. `analysis/02` §5.5 already rates
this the independent approach's strongest single mechanism, and the pack's
`ContinueSessionButton` preserves no state at all.

## Rejected because

- **MSAL-native return** — restores a URL but loses action and resource intent, depends on
  parameters surviving the round trip, and has no expiry or open-redirect defence of its
  own.

## Evidence

- `sources/independent/independent-approach.md` §7, §12, §15.2, §15.4.
- `analysis/02-approach-comparison.md` §5.2, §5.5, §7.3.
- v5 removal of `navigateToLoginRequestUrl` from `BrowserAuthOptions`: recorded in
  `analysis/02` §7.3 from the v4→v5 migration guide. **Not re-verified in this session.**

## Consequences

- Topic 9 (`interaction-recovery`) inherits the continuation record as the mechanism and
  must specify the nonce, the window, the clearing point, and the `normalizeInternalReturnPath`
  rules including the optional known-prefix restriction — which under `0002` can be
  tightened to the three application prefixes.
- Topic 4 (`msal-instance-and-bootstrap`) must not put `navigateToLoginRequestUrl` in
  `auth` config. Worth a unit test asserting the config object's shape, since the failure
  is silent.
- `sessionStorage` is per-document, which is correct here: the record belongs to the tab
  that started the interaction.
- The record never contains tokens, claims, names, emails or roles. Standing rule.

## Open

Whether `normalizeInternalReturnPath` restricts to the three known application prefixes or
accepts any root-relative path. Deferred to topic 9.
