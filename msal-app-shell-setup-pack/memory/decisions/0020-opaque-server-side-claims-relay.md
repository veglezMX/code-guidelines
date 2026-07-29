# 0020 — Relay navigation-spanning claims challenges by opaque handle

Status: accepted
Date: 2026-07-29
Topic: cae-and-claims-challenge

## Context

A child can use a CAE claims challenge in memory, but portal-owned redirect interaction
requires a full navigation. Persisting the raw challenge in browser state would violate
the workspace's sensitive-data rule.

## Decision

Enable `clientCapabilities: ["CP1"]` only after owned APIs and a central server-side
relay are deployed. The relay stores a bounded raw challenge for at most five minutes and
issues a cryptographically random, subject/resource-bound, single-use opaque ID. Only the
ID crosses navigation in the continuation record.

## Why

The portal receives the policy context needed by MSAL without putting raw claims into a
URL, storage, event channel, or log. The relay handles no tokens and proxies no API
traffic, so it does not change the browser-token architecture.

## Rejected

- Advertise CP1 without handling claims challenges.
- Store raw claims in `sessionStorage` or URL parameters.
- Discard policy context and loop through ordinary sign-in.
- Let children redirect.
- Expand the relay into a token handler/API proxy.

## Evidence

- [Microsoft claims challenge protocol](https://learn.microsoft.com/en-us/entra/identity-platform/claims-challenge).
- [Microsoft Continuous Access Evaluation](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-continuous-access-evaluation).

## Consequences

The deployment needs a small security-sensitive backend component, service
authentication, rate limits, and test-tenant validation. External APIs require a separate
review.
