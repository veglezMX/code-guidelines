# 0024 — Preserve route prefixes and keep fallbacks application-owned

Status: accepted
Date: 2026-07-29
Topic: routing-and-deep-links

## Context

Route-based independent SPAs require deep links, while ingress rewrites and a universal
fallback can accidentally boot portal HTML or return HTML for APIs/assets.

## Decision

Use exact and prefix Kubernetes Ingress paths with no regex/rewrite. Preserve the request
path. Configure Vite/router/container bases per application and keep each history fallback
inside its web service. Cross-application links are full navigations.

Release assets are content-hashed, release-qualified, published before HTML, and retained
for current/rollback pages.

## Why

Every route has one owner and the behavior is independent of ingress rewrite annotations.
Old open pages can still lazy-load their immutable chunks after a release.

## Rejected

- Rewrite every app prefix to `/`.
- Serve portal HTML for child paths.
- Use client-router navigation across documents.
- Share an unqualified asset namespace.
- Remove old chunks during HTML rollout.

## Evidence

- [Kubernetes Ingress path matching](https://kubernetes.io/docs/concepts/services-networking/ingress/).
- [Vite public base path](https://vite.dev/guide/build#public-base-path).
- [React Router basename](https://reactrouter.com/api/declarative-routers/BrowserRouter).

## Consequences

Deployment must implement asset retention and blue/green switching. Every app needs
prefix-aware build, web-server, router, and deep-link tests.
