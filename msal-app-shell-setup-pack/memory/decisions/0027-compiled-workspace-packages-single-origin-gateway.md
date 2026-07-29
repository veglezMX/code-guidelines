# 0027 — Compile shared workspace packages and use a single-origin dev gateway

Status: accepted
Date: 2026-07-29
Topic: workspace-and-packages

## Context

Independent deployments still need one reviewed auth/chrome implementation and local
behavior that matches same-origin cache, channel, bridge and route assumptions.

## Decision

Use one exact-version pnpm workspace/lockfile. Compile acyclic shared packages into each
independently built SPA; duplicate app chrome per document. Build the bridge as a minimal
portal entry. Front three prefix-aware Vite servers with local nginx at
`http://localhost:4173`.

## Why

Shared behavior is fixed/tested once without runtime composition or synchronized
production deployment. The browser exercises the real origin/path model in development.

## Rejected

- Runtime module federation/remotes.
- Copied auth source.
- One combined deploy artifact.
- Separate browser origins/ports.
- Package-global PCA.
- Environment-baked secrets/config.

## Evidence

- [pnpm workspaces](https://pnpm.io/workspaces).
- [pnpm Docker guidance](https://pnpm.io/docker).
- [Vite server security/options](https://vite.dev/config/server-options).

## Consequences

Shared-package changes fan out through affected builds. Implementation must pin
container digests, create the gateway, and prove one MSAL resolution.
