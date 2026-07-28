# Install and Runtime Configuration

## 1. Install current packages

From `code/frontend`:

```bash
pnpm --filter app-shell add \
  react@19.2.8 \
  react-dom@19.2.8 \
  react-router@8.3.0 \
  @azure/msal-browser@5.17.1 \
  @azure/msal-react@5.5.3

pnpm --filter app-shell add -D \
  typescript@7.0.2 \
  vite@8.1.5 \
  @vitejs/plugin-react
```

Shared packages should use `workspace:*` dependencies.

## 2. Use runtime configuration

Frontend identifiers are public, but Kubernetes deployments should still avoid rebuilding one image per environment. Serve a non-secret runtime configuration document.

```json
{
  "entra": {
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "clientId": "11111111-1111-1111-1111-111111111111"
  },
  "resources": {
    "portalApi": {
      "basePath": "/api/portal/v1/",
      "scopes": [
        "api://22222222-2222-2222-2222-222222222222/portal.access"
      ]
    },
    "child0Api": {
      "basePath": "/api/child0/v1/",
      "scopes": [
        "api://33333333-3333-3333-3333-333333333333/child0.access"
      ]
    }
  }
}
```

Suggested public path:

```text
/runtime-config.json
```

Serve it with `Cache-Control: no-store`.

## 3. Define and validate the type

```ts
export type ResourceConfig = Readonly<{
  basePath: string;
  scopes: readonly string[];
}>;

export type RuntimeConfig = Readonly<{
  entra: Readonly<{
    tenantId: string;
    clientId: string;
  }>;
  resources: Readonly<{
    portalApi: ResourceConfig;
    child0Api: ResourceConfig;
  }>;
}>;

function requireString(
  value: unknown,
  path: string,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing runtime configuration: ${path}`);
  }

  return value;
}

function requireStringArray(
  value: unknown,
  path: string,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`Invalid runtime configuration: ${path}`);
  }

  return value;
}

function parseResource(
  value: unknown,
  path: string,
): ResourceConfig {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid runtime configuration: ${path}`);
  }

  const record = value as Record<string, unknown>;

  return {
    basePath: requireString(record.basePath, `${path}.basePath`),
    scopes: requireStringArray(record.scopes, `${path}.scopes`),
  };
}

export function parseRuntimeConfig(
  value: unknown,
): RuntimeConfig {
  if (!value || typeof value !== "object") {
    throw new Error("Runtime configuration must be an object");
  }

  const root = value as Record<string, unknown>;
  const entra = root.entra as Record<string, unknown> | undefined;
  const resources = root.resources as
    | Record<string, unknown>
    | undefined;

  if (!entra || !resources) {
    throw new Error("Runtime configuration is incomplete");
  }

  return {
    entra: {
      tenantId: requireString(entra.tenantId, "entra.tenantId"),
      clientId: requireString(entra.clientId, "entra.clientId"),
    },
    resources: {
      portalApi: parseResource(
        resources.portalApi,
        "resources.portalApi",
      ),
      child0Api: parseResource(
        resources.child0Api,
        "resources.child0Api",
      ),
    },
  };
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await fetch("/runtime-config.json", {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Runtime configuration failed with ${response.status}`,
    );
  }

  return parseRuntimeConfig(await response.json());
}
```

## 4. Build the MSAL configuration

```ts
import {
  BrowserCacheLocation,
  LogLevel,
  type Configuration,
} from "@azure/msal-browser";

import type { RuntimeConfig } from "./loadRuntimeConfig";

export function createMsalConfiguration(
  runtimeConfig: RuntimeConfig,
): Configuration {
  return {
    auth: {
      clientId: runtimeConfig.entra.clientId,
      authority:
        `https://login.microsoftonline.com/${runtimeConfig.entra.tenantId}`,
      redirectUri:
        `${window.location.origin}/auth-redirect.html`,
      postLogoutRedirectUri:
        `${window.location.origin}/signed-out`,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
        loggerCallback(
          level,
          message,
          containsPii,
        ) {
          if (containsPii) {
            return;
          }

          if (level === LogLevel.Error) {
            console.error(message);
          }

          if (level === LogLevel.Warning) {
            console.warn(message);
          }
        },
      },
    },
  };
}
```

## Why `localStorage`

The requirement is shared authentication status across same-origin tabs. MSAL only broadcasts cross-tab account state when configured with `localStorage`.

Do not treat this as permission to use `localStorage` directly. The application must never read, write, copy, enumerate, or transform MSAL cache entries.
