# 0021 — Recover interaction through one explicit portal continuation

Status: accepted
Date: 2026-07-29
Topic: interaction-recovery

## Context

Children must remain silent-only, while login, consent, account selection, refresh-token
expiry, and claims challenges can require interaction and exact-route recovery.

## Decision

Store one exact-shape continuation in tab-local sessionStorage for at most ten minutes.
Validate it against known application routes. Navigate children to `/auth/continue`;
retry silently in the portal, then require explicit user action before a background/API
recovery redirect. Bind the redirect with opaque custom state and clear the record before
final return.

## Why

One portal flow preserves application context without putting sensitive data in URLs or
duplicating interactive code across deployments.

## Rejected

- Child-owned interaction.
- Automatic redirect after every silent failure.
- Query-string continuation.
- MSAL-native return URL alone.
- Interaction recovery for bridge timeout.

## Evidence

- [MSAL interaction errors](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/errors).
- [OWASP redirect validation](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html).

## Consequences

The portal needs continue/account-select/error routes and a compiled route allowlist.
Without sessionStorage, recovery deliberately falls back to portal root.
