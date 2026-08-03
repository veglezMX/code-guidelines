# nginx and Security Headers

Status: settled
Decisions: 0026 · inherits 0002, 0004, 0007, 0013, 0017, 0024, 0033
Sources: pack `11` · independent §2.1 · analysis `02` §6.5 ·
[nginx `try_files`](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files) ·
[nginx headers module](https://nginx.org/en/docs/http/ngx_http_headers_module.html) ·
[Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) ·
[Kubernetes probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

## Rule

Ingress terminates TLS and routes paths; each web container serves its own SPA fallback,
cache policy, and response headers. Normal application pages cannot be framed. The MSAL
bridge is the deliberate exception: it is same-origin-frameable and carries no COOP
header.

## Design

Use nginx `>=1.29.3` so `add_header_inherit` behavior is explicit and testable.

Common document policy:

```text
Content-Security-Policy:
  default-src 'self';
  base-uri 'none';
  object-src 'none';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self' https://login.microsoftonline.com;
  frame-src 'self' https://login.microsoftonline.com;
  frame-ancestors 'none';
  form-action 'self' https://login.microsoftonline.com;
  manifest-src 'self';
  worker-src 'none';
  upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

Do not add `unsafe-inline`, `unsafe-eval`, wildcard script/connect sources, runtime
third-party scripts, or an unreviewed telemetry endpoint. When telemetry is selected,
add its one exact origin through environment-reviewed configuration.

This CSP is not hardening; it is a **primary control**. One origin, one Entra client ID
and MSAL's `localStorage` cache mean any script that executes here can mint tokens for
every API in the suite with a correct audience, which no backend check rejects
(`topology` Open 1, `authorization-layers`). Together with exact dependency/lockfile
review and the no-third-party-runtime-script rule, `script-src 'self'` is what keeps
that code from executing. Shipping the CSP in report-only mode, or relaxing it to
accommodate a product feature, removes a control the architecture depends on and needs
a security-owner decision, not a configuration change.

`/auth-redirect.html` has a separate minimal policy:

- `Cache-Control: no-store`;
- `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`;
- no `Cross-Origin-Opener-Policy`;
- same-origin scripts only, no inline script;
- `default-src 'none'; script-src 'self'; connect-src 'self';
  frame-ancestors 'self'; base-uri 'none'; form-action 'none'`.

Generated-config tests must prove the bridge response lacks COOP and `DENY`; inheriting
either breaks MSAL v5. `/portal-runtime.json` and `/signed-out` are also `no-store`.

Cache/fallback policy:

| Response | Cache | Fallback |
|---|---|---|
| SPA `index.html` | `no-cache, max-age=0, must-revalidate` | app-owned `try_files` target |
| release-qualified hashed asset | `public, max-age=31536000, immutable` | `404` |
| `/auth-redirect.html` | `no-store` | none |
| `/portal-runtime.json` | `no-store` | none |
| `/signed-out` | `no-store` | none |
| missing/API path | appropriate JSON/`404` | never SPA HTML |

Representative child behavior:

```nginx
location = /child0 {
    return 308 /child0/;
}

location ^~ /child0/assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}

location /child0/ {
    try_files $uri $uri/ /child0/index.html;
    add_header Cache-Control "no-cache, max-age=0, must-revalidate" always;
}
```

The production config uses `add_header_inherit merge` or generated complete location
blocks so cache headers do not accidentally remove security headers. Portal has exact
locations for bridge, runtime config and signed-out before its `/` fallback.

Ingress owns HTTPS redirect and HSTS:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Add `preload` only after the domain owner verifies every subdomain is permanently HTTPS
and deliberately submits it. Services do not trust client-supplied forwarding headers;
the ingress overwrites and the application trusts only the cluster ingress hop.

Each container exposes a local `/healthz` for Kubernetes readiness/liveness probes.
Probes target the Pod/Service directly, not the public ingress, and the endpoint returns
no build/config/identity data.

Access logs use method, normalized `$uri` (not `$request_uri`), status, duration,
upstream/service, release ID, request ID, and trace ID only. Never log query strings,
cookies, authorization headers, redirect fragments, claims challenges, or response
bodies. APIs set their own content/cache/CORS policies; same-origin browser access needs
no permissive CORS.

## Why not the alternatives

- **Ingress-wide regex/rewrite SPA fallback** — rejected in `0026`; it can affect every
  host path and return HTML for APIs/assets.
- **One inherited header set including the bridge** — rejected in `0026`; COOP and
  frame-denial break the hidden bridge.
- **Long-cache HTML** — rejected in `0026`; it strands clients on removed chunks/config.
- **CSP with `unsafe-inline`/wildcards by default** — rejected in `0026`; it weakens the
  principal XSS mitigation of the shared-origin/localStorage design.
- **Log `$request_uri`** — rejected in `0026`; it includes query strings.

## Open

1. Deployment owners must choose CSP report collection, telemetry origin, HSTS preload,
   and exact TLS/certificate policy.
2. Exact nginx/container image digests and ingress-controller version remain deployment
   inputs.
3. Product applications must prove they build without inline/eval requirements before
   the CSP can ship in enforcing mode.
