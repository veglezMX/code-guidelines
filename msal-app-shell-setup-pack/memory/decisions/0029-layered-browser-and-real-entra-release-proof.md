# 0029 — Require layered browser and real-Entra release proof

Status: accepted
Date: 2026-07-29
Topic: testing

## Context

There is no official MSAL v5 how-to for this exact three-document/shared-client
deployment. Mock tests cannot prove bridge/cache/tenant behavior, while real-tenant tests
alone cannot safely/exhaustively cover malicious inputs and failures.

## Decision

Gate releases with static/version checks, high-coverage pure logic, React/package
integration, API contracts, built nginx/header/route tests, Playwright Chromium/Firefox/
WebKit at one local origin, and protected real-Entra smoke. Add scheduled CAE and
approximately-24-hour soak scenarios.

Never persist real-auth browser state or unsanitized trace/HAR/video/screenshot artifacts.

## Why

Each layer proves a different risk, and only the combination supplies evidence for the
unsupported-by-guidance deployment shape without leaking bearer material through CI.

## Rejected

- Mock-only or real-tenant-only testing.
- Chromium-only.
- Persist normal Playwright auth artifacts.
- One combined build as independent-deployment proof.
- Retry flaky security tests until green.

## Evidence

- [MSAL Browser testing](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/testing).
- [Playwright authentication](https://playwright.dev/docs/auth).
- [Playwright browser projects](https://playwright.dev/docs/browsers).

## Consequences

Implementation needs test adapters, a protected tenant, synthetic identities, CI cleanup,
long-run schedules, browser/container digests and clear ownership.
