# Session: direct child authentication

Date: 2026-07-29

- Defined direct child entry with no cached MSAL account as foreground sign-in intent.
- The child stores a validated tab-local continuation and navigates to portal
  `/auth/continue`.
- The portal rechecks the shared cache, attempts `ssoSilent` once, and owns interactive
  fallback.
- Successful authentication returns to the exact validated child deep link.
- A persisted automatic-attempt marker prevents silent or interactive redirect loops.
- Background/API recovery still requires an explicit Continue action.
- Decision `0031` refines bootstrap, account resolution, continuation, and routing.
