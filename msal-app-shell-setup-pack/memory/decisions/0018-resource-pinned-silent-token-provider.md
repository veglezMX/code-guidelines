# 0018 — Keep token acquisition silent, account-explicit, and resource-pinned

Status: accepted
Date: 2026-07-29
Topic: token-acquisition

## Context

One shared client ID makes browser-side resource separation a soft boundary. The sources
also disagree about whether a timeout should trigger interaction, and simultaneous calls
need coalescing.

## Decision

Give each application only its own closed resource definition. Acquire silently with an
explicit active account, keep tokens private to the HTTP adapter, deduplicate equivalent
in-document promises, and preserve `bridge-unavailable` as distinct from
`interaction-required`.

## Why

This minimizes accidental cross-resource requests, keeps bearer material out of
application state, and prevents a broken redirect bridge from entering an interaction
loop.

## Rejected

- Public generic `getToken(scopes)`.
- Interactive fallback in a child/token provider.
- Cross-document local-storage locking.
- Forced renewal on every page load.
- Mapping `timed_out` to interaction-required.

## Evidence

- [MSAL token acquisition](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/acquire-token).
- [MSAL resource/scope rules](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/resources-and-scopes).
- Pinned `@azure/msal-browser@5.17.3` public types and error codes.

## Consequences

Backend audience validation remains mandatory. Browser tests must cover renewal races in
three independently loaded documents.
