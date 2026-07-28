# Authorized HTTP and API Scopes

## Rule: one token per resource

The Portal API and Child0 API have different audiences. Acquire a token with only the scopes for the API being called.

## Error representation

Use a functional error factory rather than a custom error class.

```ts
export type ApplicationErrorCode =
  | "interaction-required"
  | "unauthenticated"
  | "api-unauthorized"
  | "api-forbidden"
  | "api-failure";

export type ApplicationError = Error & Readonly<{
  code: ApplicationErrorCode;
  status?: number;
  cause?: unknown;
}>;

export function createApplicationError(
  code: ApplicationErrorCode,
  message: string,
  options: Readonly<{
    status?: number;
    cause?: unknown;
  }> = {},
): ApplicationError {
  return Object.assign(new Error(message), {
    code,
    ...options,
  });
}
```

## Token acquisition function

```ts
import {
  InteractionRequiredAuthError,
  type IPublicClientApplication,
} from "@azure/msal-browser";

import {
  createApplicationError,
} from "./createApplicationError";

export async function acquireResourceToken({
  instance,
  scopes,
}: {
  instance: IPublicClientApplication;
  scopes: readonly string[];
}): Promise<string> {
  const account = instance.getActiveAccount();

  if (!account) {
    throw createApplicationError(
      "unauthenticated",
      "No active account is available",
    );
  }

  try {
    const result = await instance.acquireTokenSilent({
      account,
      scopes: [...scopes],
    });

    return result.accessToken;
  } catch (error: unknown) {
    if (error instanceof InteractionRequiredAuthError) {
      throw createApplicationError(
        "interaction-required",
        "User interaction is required",
        { cause: error },
      );
    }

    throw error;
  }
}
```

Do not automatically call `acquireTokenRedirect()` inside a generic interceptor. Several concurrent requests could start overlapping interactive operations.

## Resource-restricted client factory

```ts
import type {
  IPublicClientApplication,
} from "@azure/msal-browser";

import {
  acquireResourceToken,
} from "./acquireResourceToken";
import {
  createApplicationError,
} from "./createApplicationError";

export type ApiResourceDefinition = Readonly<{
  baseUrl: URL;
  scopes: readonly string[];
}>;

export type AuthorizedHttpClient = Readonly<{
  request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T>;
}>;

export function createAuthorizedHttpClient({
  instance,
  resource,
}: {
  instance: IPublicClientApplication;
  resource: ApiResourceDefinition;
}): AuthorizedHttpClient {
  return {
    async request<T>(
      path: string,
      init: RequestInit = {},
    ): Promise<T> {
      const target = new URL(path, resource.baseUrl);

      if (target.origin !== resource.baseUrl.origin) {
        throw createApplicationError(
          "api-failure",
          "Cross-origin API target was rejected",
        );
      }

      if (!target.pathname.startsWith(resource.baseUrl.pathname)) {
        throw createApplicationError(
          "api-failure",
          "API path escaped the configured resource base",
        );
      }

      const accessToken = await acquireResourceToken({
        instance,
        scopes: resource.scopes,
      });

      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("X-Correlation-ID", crypto.randomUUID());

      const response = await fetch(target, {
        ...init,
        headers,
      });

      if (response.status === 401) {
        throw createApplicationError(
          "api-unauthorized",
          "The API rejected the authentication token",
          { status: 401 },
        );
      }

      if (response.status === 403) {
        throw createApplicationError(
          "api-forbidden",
          "The operation is not permitted",
          { status: 403 },
        );
      }

      if (!response.ok) {
        throw createApplicationError(
          "api-failure",
          `API request failed with ${response.status}`,
          { status: response.status },
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;
    },
  };
}
```

## Build clients in the shell

```ts
export function createApiClients({
  instance,
  runtimeConfig,
}: {
  instance: IPublicClientApplication;
  runtimeConfig: RuntimeConfig;
}) {
  return {
    portal: createAuthorizedHttpClient({
      instance,
      resource: {
        baseUrl: new URL(
          runtimeConfig.resources.portalApi.basePath,
          window.location.origin,
        ),
        scopes: runtimeConfig.resources.portalApi.scopes,
      },
    }),
    child0: createAuthorizedHttpClient({
      instance,
      resource: {
        baseUrl: new URL(
          runtimeConfig.resources.child0Api.basePath,
          window.location.origin,
        ),
        scopes: runtimeConfig.resources.child0Api.scopes,
      },
    }),
  } as const;
}
```

Inject only `apiClients.child0` into Child0.

## Interactive recovery

When `interaction-required` reaches a controlled shell boundary, render one explicit continuation action.

```tsx
import { useMsal } from "@azure/msal-react";

export function ContinueSessionButton({
  scopes,
}: {
  scopes: readonly string[];
}) {
  const { instance } = useMsal();

  function continueSession(): void {
    const account = instance.getActiveAccount();

    void instance.acquireTokenRedirect({
      ...(account ? { account } : {}),
      scopes: [...scopes],
    });
  }

  return (
    <button type="button" onClick={continueSession}>
      Continue session
    </button>
  );
}
```

Never interpret `403` as a reason to reauthenticate. A new token does not grant missing authorization.
