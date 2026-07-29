# Session — edge and access

Date: 2026-07-29
Topics: `routing-and-deep-links`, `authorization-layers`, `nginx-and-headers`

- Fixed exact/prefix ingress ownership with no regex or rewrite.
- Kept each application's public base, router and history fallback in its own service.
- Added release-qualified immutable assets and old-chunk retention as a rollout contract.
- Assigned launch discovery/checks to portal-api while keeping every backend authoritative.
- Explicitly documented the shared-client soft token boundary and audience enforcement.
- Selected service-owned CSP/cache/fallback headers with ingress-owned TLS/HSTS.
- Added the bridge exceptions: same-origin framing, no COOP, no-store.
- Real hosts, policies, asset mechanism, CSP reporting and image digests remain inputs.
