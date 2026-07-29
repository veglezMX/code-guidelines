# 0014 — Use a TypeScript 7-compatible quality toolchain

Status: accepted
Date: 2026-07-29
Topic: version-baseline

## Context

The original exact baseline selected TypeScript `7.0.2` and Node `>=22.22.0`, but left
test and lint dependencies open. Registry verification found two constraints:

- `typescript-eslint@8.65.0`, including its canary, declares TypeScript `<6.1.0`;
- `jsdom@30.0.1` requires Node `^22.22.2` on the Node 22 line.

## Decision

Keep TypeScript `7.0.2`. Use Oxlint `1.76.0` plus
`oxlint-tsgolint@7.0.2001` for TypeScript-7-compatible linting, and keep
`tsc --noEmit` as the authoritative type-check gate. Raise the Node floor to
`>=22.22.2`.

Pin Vitest `4.1.10`, coverage-v8 `4.1.10`, Playwright Test `1.62.0`,
Testing Library React `16.3.2`, Testing Library DOM `10.4.1`, user-event `14.6.1`,
jsdom `30.0.1`, and matching React/Node type packages exactly.

## Why

This preserves the already verified TypeScript baseline without accepting an unsupported
parser peer range. Oxlint implements the needed React, hooks, TypeScript, import, Vitest,
and accessibility rule families and its type-aware engine explicitly requires
TypeScript 7.

## Rejected

- Downgrade TypeScript solely for `typescript-eslint` — reverses the settled baseline.
- Use `typescript-eslint` outside its peer range — unsupported and non-reproducible.
- Use floating test dependencies — contradicts decision `0013`.

## Evidence

- npm registry queries on 2026-07-29.
- [Oxlint type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html).
- [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/) package
  metadata.

## Consequences

- The implementation build image must be Node `22.22.2` or newer.
- `workspace-and-packages` and `testing` inherit these exact pins.
- Container digests remain deployment-repository inputs.
