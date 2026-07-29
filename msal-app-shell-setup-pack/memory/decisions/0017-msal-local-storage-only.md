# 0017 — Reserve localStorage for the shared MSAL cache

Status: accepted
Date: 2026-07-29
Topic: cache-and-storage

## Context

Independent documents need a shared same-origin cache. `localStorage` supplies that
behavior but expands the impact of XSS, and MSAL encryption is skipped under Keep Me
Signed In.

## Decision

Use MSAL `localStorage` with `cacheRetentionDays: 5`. Treat its keys as opaque. Do not add
application token/account mirrors or a local-storage event bus. Limit application
`sessionStorage` to the short-lived continuation record and opaque tab ID.

## Why

It is the only settled browser-only option that preserves cache sharing across the three
documents. Additional stores increase exposure without improving isolation.

## Rejected

- MSAL memory/session storage, which breaks cross-document sharing.
- Rely on cache encryption as an XSS defense.
- Read or manipulate MSAL keys from application code.
- Add a durable application logout marker.

## Evidence

- [MSAL caching](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching).
- [OWASP HTML5 storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

## Consequences

The suite accepts a same-origin XSS blast radius. CSP, dependency controls, and the ban on
unreviewed runtime scripts become release requirements.
