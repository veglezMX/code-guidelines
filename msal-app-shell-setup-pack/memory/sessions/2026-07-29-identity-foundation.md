# Session — identity foundation

Date: 2026-07-29
Topics: `entra-registration`, `account-resolution`, `cache-and-storage`

- Defined the three SPAs as one logical client and shared security boundary.
- Kept portal-api, child0-api, and child1-api as separate resource registrations.
- Fixed exact bridge/signed-out redirects and separate environment registrations.
- Settled deterministic account resolution with portal-owned multiple-account selection.
- Kept raw `AccountInfo` inside the auth adapter.
- Selected MSAL-only localStorage with five-day cache retention.
- Limited application storage to a ten-minute continuation and opaque tab ID.
- Real identifiers, tenant policy, and UI copy remain deployment/product inputs.
