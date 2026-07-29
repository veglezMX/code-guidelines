# Session — recovery and logout

Date: 2026-07-29
Topics: `interaction-recovery`, `token-lifetime-24h`, `cross-tab-and-logout`

- Completed the ten-minute exact-shape continuation and internal-route validation rules.
- Kept background interaction behind an explicit portal Continue action.
- Defined sessionStorage-unavailable and bridge-unavailable behavior without URL fallback.
- Accepted on-demand MSAL renewal at the fixed SPA refresh-token lifetime boundary.
- Made logout portal-only, redirect-based, and single-initiator.
- Limited BroadcastChannel to logout/session invalidation and specified receiver cleanup.
- Selected MSAL/lifecycle events instead of an application localStorage fallback bus.
- UI copy, long-running draft preservation, and tenant/browser validation remain inputs.
