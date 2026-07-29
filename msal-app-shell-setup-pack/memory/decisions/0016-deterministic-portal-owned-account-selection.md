# 0016 — Resolve accounts deterministically and select only in the portal

Status: accepted
Date: 2026-07-29
Topic: account-resolution

## Context

The shared MSAL cache can contain zero, one, or multiple accounts. Selecting array
element zero is nondeterministic and leaking raw `AccountInfo` would spread identity
attributes through application state.

## Decision

Prefer a still-cached active account; set the only cached account active; return
`unauthenticated` for zero and `selection-required` for multiple. The portal owns the
multiple-account UI. Keep `AccountInfo` inside the auth adapter and use MSAL's active
account as the only persisted selection.

## Why

Every document reaches the same explicit state without depending on cache ordering or a
second application-owned identity key.

## Rejected

- First cached account wins.
- Persist username/home-account ID separately.
- Expose `AccountInfo` as general React/domain state.
- Let child applications conduct account interaction.

## Evidence

- [MSAL account APIs](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/login-user).
- [MSAL events](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/events).

## Consequences

Account changes invalidate all account-bound application memory. Product design must
provide the portal selection page.
