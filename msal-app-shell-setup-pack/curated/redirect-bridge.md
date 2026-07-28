# Redirect Bridge

Status: settled
Decisions: 0007, 0008, 0009, 0010 · inherits 0002, 0004
Sources: pack `00` "Important MSAL v5 changes", pack `05`, pack `11` · independent §12,
§15.1–§15.4 · analysis `01` §1, §2.5, rec 10 · analysis `02` §7.1–§7.4 ·
[Set up the redirect bridge page in MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/redirect-bridge)
· [Migrate from MSAL Browser v4 to v5](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/v4-migration)

## Rule

1. **One bridge document, shipped by the portal, shared by all three applications.**
   `/auth-redirect.html` is the `redirectUri` for `portal`, `child0` and `child1`. One
   redirect URI is registered per environment, not three.
2. **The bridge does one thing.** It calls `broadcastResponseToMainFrame()` and nothing
   else. No React, no router, no `MsalProvider`, no application bootstrap, no API call, no
   custom hash or query parsing.
3. **The bridge is never served with a `Cross-Origin-Opener-Policy` header.** COOP on this
   page swaps the browsing-context group and severs the channel. It is served
   `Cache-Control: no-store`.
4. **The bridge page and every asset it loads are same-origin.** Never a third-party CDN —
   the bridge receives raw authorization codes and tokens.
5. **All three applications configure the bridge `redirectUri`.** This is not portal-only:
   in v5 the `acquireTokenSilent` iframe path also routes through the bridge, so a child
   without it cannot acquire a token silently. The value comes from the shared `auth` block
   of `/portal-runtime.json` (`0004`) and is identical everywhere.
6. **`/auth/callback` is deleted.** It has no role under v5. The portal processes the
   response at bootstrap. `/auth/continue` is unchanged and keeps its role.
7. **Only the portal calls `handleRedirectPromise`**, once, during bootstrap, before
   render. Children never call it.
8. **Return navigation is owned by the continuation record**, not by MSAL. Where
   `navigateToLoginRequestUrl` is needed it is passed to `handleRedirectPromise`, not set
   in `auth` config — v5 moved it, and the v4 placement is silently ignored.
9. **A bridge timeout is a distinct, non-interactive failure.** It must never be
   classified as `interaction-required`, because redirecting to the portal to fix a bridge
   that will not load produces a redirect loop.
10. **Local development is single-origin.** One dev port fronts all three applications and
    the bridge, mirroring the production route map, with one dev redirect URI.

## Design

### Files

```text
apps/portal/auth-redirect.html          ← the bridge document
apps/portal/src/auth/redirect-bridge.ts ← its only script
```

```ts
// apps/portal/src/auth/redirect-bridge.ts
import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

async function runRedirectBridge(): Promise<void> {
  await broadcastResponseToMainFrame();
}

void runRedirectBridge().catch((error: unknown) => {
  // No PII, no token material. The bridge has no logger and no telemetry transport.
  console.error("MSAL redirect bridge failed", error);
});
```

```html
<!-- apps/portal/auth-redirect.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Completing sign-in</title>
  </head>
  <body>
    <p>Completing sign-in…</p>
    <script type="module" src="/src/auth/redirect-bridge.ts"></script>
  </body>
</html>
```

The script is external and module-typed so the CSP needs no `unsafe-inline`.

Portal Vite build declares both entries:

```ts
build: {
  rollupOptions: {
    input: {
      app: fileURLToPath(new URL("./index.html", import.meta.url)),
      authRedirect: fileURLToPath(new URL("./auth-redirect.html", import.meta.url)),
    },
  },
}
```

### Route map delta

Supersedes the map in `topology.md` for these two rows:

| Route | Serves | Notes |
|---|---|---|
| `/auth-redirect.html` | bridge document | **no COOP**, `no-store`, exact-match location |
| `/auth/callback` | — | deleted |
| `/auth/continue` | portal `index.html` | unchanged |

nginx, as the requirement that topic 17 must satisfy:

```nginx
map $uri $coop_value {
    default              "same-origin";
    /auth-redirect.html  "";        # empty value → nginx emits no header
}

location = /auth-redirect.html {
    proxy_pass http://app_portal;
    proxy_hide_header Cross-Origin-Opener-Policy;
    add_header Cache-Control "no-store" always;
}
```

The exact-match `location =` matters under `0002`: the per-application history fallbacks
must not swallow this path, and it must not be answered with any app's `index.html`.

### Configuration

```jsonc
// /portal-runtime.json — identical in every application's key
"auth": {
  "clientId": "…",
  "authority": "https://login.microsoftonline.com/<tenant>",
  "redirectUri": "/auth-redirect.html",
  "cache": { /* identical across apps — see topology.md invariant 4 */ }
}
```

Timeouts are set deliberately rather than left at default:

```ts
system: {
  iframeBridgeTimeout: /* ms */,   // was iframeHashTimeout in v4
  popupBridgeTimeout:  /* ms */,   // was windowHashTimeout in v4
}
```

### Failure model

`bridge-unavailable` is a distinct outcome of token acquisition, separate from
`interaction-required` and from `unauthenticated`. Handling:

- Never redirect to the portal on it.
- Surface as a transient error with a retry affordance.
- Emit telemetry with `errorCode` and `correlationId`, no PII.

Most likely causes, in order: the bridge path is being served by an application's history
fallback instead of the bridge document; a COOP header leaked onto it; the bridge asset
failed to load; a redirect-URI mismatch in Entra.

### Entra registration

One SPA-platform redirect URI per environment, matched exactly on scheme, host, port and
path:

```text
https://portal.example.com/auth-redirect.html
http://localhost:<dev-proxy-port>/auth-redirect.html
```

Detail belongs to topic `entra-registration` (3); the shape is fixed here.

### Local development

A single dev origin fronts portal, child0, child1 and the bridge with the production route
map. Three Vite servers on three ports would be three origins, which breaks the shared MSAL
cache that the whole topology depends on — cross-app SSO and cross-tab logout would be
untestable locally, and the bridge would need a redirect URI per port. Mechanism (dev
proxy, one Vite server with multiple roots, or a local nginx running the real config) is
topic 16's to choose; the single-origin constraint is fixed here.

## Why not the alternatives

- **`/auth/callback` as a portal SPA route** (independent §15.3) — the v4 shape; invalid
  under v5. Rejected in `0007`.
- **Per-app bridges, or a standalone bridge deployable** — rejected in `0007`.
- **MSAL-native return navigation via `navigateToLoginRequestUrl`** — rejected in `0008`.
- **Timeout folded into `interaction-required`** — rejected in `0009`.
- **Per-app dev servers on separate ports** — rejected in `0010`.

## Open

1. **Unverified: who navigates after a full-page redirect.** For a redirect flow the
   initiating document is gone by the time the bridge runs, so whether the bridge itself
   navigates onward or MSAL completes the return on the next portal load is not stated in
   either source, and `analysis/01` records the how-to page only at the level of "call
   `broadcastResponseToMainFrame()`". This does not change any decision here — the bridge
   still does nothing but broadcast, and the continuation record still owns the final
   destination — but the exact hand-off must be read from the redirect-bridge how-to before
   the bootstrap code is written. → topic `msal-instance-and-bootstrap` (4).
2. **Unverified: msal-browser version skew between the bridge and an application.** The
   bridge and the app communicate over a `BroadcastChannel`; neither source says whether
   mismatched versions interoperate. Mitigated by pinning one `@azure/msal-browser` version
   across the repo, which is required anyway. → topic `version-baseline` (20).
3. **Timeout values not chosen.** The defaults are unverified and the right value depends
   on the tenant's authority latency. → topic `msal-instance-and-bootstrap` (4).
4. **Portal deploy coupling accepted.** Under `0007` a bridge change requires a portal
   deploy, which children depend on for authentication. Revisit only if release cadences
   diverge enough to hurt.
5. **`bridge-unavailable` naming and placement in the result union** — the union lives in
   the shared auth package. → topic `token-acquisition` (7).
