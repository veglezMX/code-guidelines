# Version Baseline

Verified on **July 23, 2026**.

| Package/tool | Baseline used by this pack |
|---|---:|
| React | `19.2.8` |
| React DOM | `19.2.8` |
| `@azure/msal-browser` | `5.17.1` |
| `@azure/msal-react` | `5.5.3` |
| React Router | `8.3.0` |
| Vite | `8.1.5` |
| TypeScript | `7.0.2` |
| pnpm | `11.16.0` |
| Nginx mainline | `1.31.3` |
| Nginx stable | `1.30.4` |

Pin exact versions in the lockfile. Update through controlled pull requests rather than allowing production builds to resolve unreviewed dependency versions.

The full Nginx example in this pack requires **Nginx 1.29.3 or newer** because it uses `add_header_inherit merge` to preserve security headers when locations add cache-specific headers. Both the verified mainline and stable baselines satisfy this requirement.

## Important MSAL v5 changes

### Dedicated redirect bridge is required

MSAL React v5 depends on MSAL Browser v5. Authentication flows require a dedicated redirect bridge page. This is not an optional project convention.

The bridge was introduced as part of MSAL Browser v5 support for Cross-Origin-Opener-Policy environments. It separates the authentication response page from the main React runtime and communicates the result back to the main frame.

The bridge page:

- Must be a separate HTML entry.
- Must call `broadcastResponseToMainFrame()`.
- Must not start React.
- Must not run the application router.
- Must not make application API calls.
- Must not be served with a COOP header.
- Should be served with `Cache-Control: no-store`.

### React baseline changed

MSAL React v5 supports React `19.2.1` or newer. Do not force-install it into unsupported React versions for production use.

### Account-storage events changed

In MSAL Browser v5, account-storage events are always enabled. Older examples that call these functions are obsolete:

```ts
// Do not copy into MSAL Browser v5 code.
instance.enableAccountStorageEvents();
instance.disableAccountStorageEvents();
```

Those APIs were removed in v5.

### `LOGIN_SUCCESS` payload changed

In MSAL Browser v5, the `LOGIN_SUCCESS` event payload is `AccountInfo`, not `AuthenticationResult`.

```ts
import {
  EventType,
  type AccountInfo,
  type EventMessage,
} from "@azure/msal-browser";

export function readLoginAccount(
  event: EventMessage,
): AccountInfo | null {
  if (event.eventType !== EventType.LOGIN_SUCCESS) {
    return null;
  }

  return event.payload as AccountInfo;
}
```

Reserve `AuthenticationResult` for token acquisition events such as `ACQUIRE_TOKEN_SUCCESS`.

### Removed cache options

Do not copy older examples containing these removed MSAL Browser v5 options:

```ts
// Removed or obsolete in v5.
temporaryCacheLocation
storeAuthStateInCookie
secureCookies
cacheMigrationEnabled
claimsBasedCachingEnabled
```

## `localStorage` security note

This pack deliberately selects `localStorage` because cross-tab synchronization is a requirement.

Current MSAL versions encrypt local-storage authentication artifacts. That encryption reduces persistence after the browser session and prevents straightforward reuse of stale encrypted entries. It is **not an XSS defense**. Code running in the origin can act as the user even without directly reading cached token strings.

Therefore, `localStorage` requires:

- Strict CSP.
- No untrusted scripts.
- No unsafe HTML injection.
- Dependency and artifact governance for every same-origin child.
- No direct application access to the MSAL cache.
- No token copies in Zustand, Redux, Context, IndexedDB, or custom storage keys.
