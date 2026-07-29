# 0022 — Renew on demand and recover explicitly at the SPA lifetime boundary

Status: accepted
Date: 2026-07-29
Topic: token-lifetime-24h

## Context

Refresh tokens issued to `spa` redirect URIs expire after approximately 24 hours and
replacement refresh tokens do not extend that original lifetime. Silent authorization
may still succeed through the Entra session, but browser/session policy can require
top-level interaction.

## Decision

Let MSAL renew on demand. Do not parse tokens, schedule reloads, or force refresh on
document startup. Route real interaction-required outcomes through the explicit portal
continuation and return to the validated route.

## Why

It models actual identity state, including revocation and Conditional Access, without
manufacturing interruptions or renewal races.

## Rejected

- 24-hour page reload/countdown.
- Application token parsing/timers.
- Startup force refresh from all documents.
- Reintroducing a BFF solely for this lifetime.

## Evidence

- [Microsoft refresh-token lifetimes](https://learn.microsoft.com/en-us/entra/identity-platform/refresh-tokens).
- [MSAL token lifetimes](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/token-lifetimes).

## Consequences

Long-running workflows need independent draft persistence, and browser/test-tenant policy
must exercise the recovery branch.
