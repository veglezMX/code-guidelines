# Session — token and API

Date: 2026-07-29
Topics: `token-acquisition`, `authorized-http`, `cae-and-claims-challenge`

- Settled silent-first, account-explicit, resource-pinned token acquisition.
- Kept access tokens private to the HTTP adapter.
- Added in-document promise deduplication and a three-document renewal test obligation.
- Preserved bridge timeout as non-interactive.
- Replaced the no-op 401 retry with one forced/claims-aware replay.
- Enabled CP1 only with complete claims-challenge handling.
- Selected a five-minute server-side claims relay so only an opaque ID crosses navigation.
- Relay implementation and test-tenant CAE policy remain deployment inputs.
