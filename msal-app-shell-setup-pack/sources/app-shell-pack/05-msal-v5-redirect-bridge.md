# MSAL v5 Redirect Bridge

## Why this pattern exists

MSAL Browser v5 introduced a redirect bridge to support authentication in environments using Cross-Origin-Opener-Policy isolation.

Traditional popup flows depend on communication between a popup and its opener. COOP can separate browsing-context groups and break that relationship. The bridge gives MSAL a dedicated response page that forwards the authentication result back to the main frame using the supported v5 mechanism.

This is a required latest-version pattern, not an optional wrapper.

## 1. Create the bridge TypeScript entry

Path:

```text
apps/app-shell/src/auth/redirect-bridge.ts
```

```ts
import {
  broadcastResponseToMainFrame,
} from "@azure/msal-browser/redirect-bridge";

async function runRedirectBridge(): Promise<void> {
  await broadcastResponseToMainFrame();
}

void runRedirectBridge().catch((error: unknown) => {
  console.error("MSAL redirect bridge failed", error);
});
```

The file contains no application bootstrap and no custom redirect parsing.

## 2. Create the dedicated HTML page

Path:

```text
apps/app-shell/auth-redirect.html
```

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <meta name="robots" content="noindex,nofollow" />
    <title>Completing sign-in</title>
  </head>
  <body>
    <p>Completing sign-in…</p>
    <script
      type="module"
      src="/src/auth/redirect-bridge.ts"
    ></script>
  </body>
</html>
```

Using an external Vite-processed script allows a CSP without `unsafe-inline`.

## 3. Add both HTML files as Vite inputs

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(
          new URL("./index.html", import.meta.url),
        ),
        authRedirect: fileURLToPath(
          new URL("./auth-redirect.html", import.meta.url),
        ),
      },
    },
  },
});
```

## 4. Register exact Entra redirect URIs

```text
http://localhost:5173/auth-redirect.html
https://portal.example.com/auth-redirect.html
```

The scheme, host, port, and path must match exactly.

## 5. Nginx exception

The page must not be served with a COOP header.

The full configuration in this pack uses a variable:

```nginx
map $uri $coop_value {
    default             "same-origin";
    /auth-redirect.html "";
}

add_header Cross-Origin-Opener-Policy $coop_value always;
```

Nginx omits an `add_header` whose resolved value is empty.

Also apply:

```nginx
location = /auth-redirect.html {
    proxy_pass http://app_shell;
    add_header Cache-Control "no-store" always;
}
```

When a location defines its own `add_header` directives, remember Nginx inheritance rules. The full example repeats all required security headers through mapped values rather than relying on accidental inheritance.

## Validation

```bash
curl -I https://portal.example.com/auth-redirect.html
```

Expected:

```text
HTTP/2 200
Cache-Control: no-store
Content-Type: text/html
```

Must not include:

```text
Cross-Origin-Opener-Policy
```

Also verify that the page does not return `index.html` and that its JavaScript asset is emitted by the Vite build.
