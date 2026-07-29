# 0026 — Keep SPA headers/fallbacks in services with a bridge exception

Status: accepted
Date: 2026-07-29
Topic: nginx-and-headers

## Context

Ingress-wide fallback/header rules can leak across portal, children and APIs. Normal pages
should resist framing/XSS, but the MSAL v5 redirect bridge must load in a same-origin
iframe and must not receive COOP.

## Decision

Ingress owns TLS redirect/HSTS/routing. nginx `>=1.29.3` in each web service owns
fallbacks, cache headers and CSP/security headers. Normal pages use frame denial and COOP
same-origin. `/auth-redirect.html` is no-store, same-origin-frameable, and has no COOP.
Asset misses and API paths never fall back to HTML.

## Why

The policy follows resource ownership and makes the bridge's required exception explicit
and testable.

## Rejected

- Ingress-wide regex rewrite/fallback.
- Apply normal page framing/COOP headers to the bridge.
- Long-cache HTML.
- Default CSP wildcards/unsafe script sources.
- Query-string access logs.

## Evidence

- [nginx `try_files`](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files).
- [nginx header inheritance](https://nginx.org/en/docs/http/ngx_http_headers_module.html).
- [CSP frame ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

## Consequences

Generated configuration and live-response tests are release gates. Deployment must pin
nginx/ingress images and supply TLS/CSP reporting choices.
