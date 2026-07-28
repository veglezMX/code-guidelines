# Shell Bootstrap and Providers

## 1. Create the MSAL instance using the v5 factory

Use the function-based `createStandardPublicClientApplication()` API.

```ts
import {
  createStandardPublicClientApplication,
  type AccountInfo,
  type Configuration,
  type IPublicClientApplication,
} from "@azure/msal-browser";

function selectInitialAccount(
  instance: IPublicClientApplication,
): AccountInfo | null {
  const activeAccount = instance.getActiveAccount();

  if (activeAccount) {
    return activeAccount;
  }

  const accounts = instance.getAllAccounts();

  if (accounts.length === 1) {
    return accounts[0] ?? null;
  }

  return null;
}

export async function createMsalInstance(
  configuration: Configuration,
): Promise<IPublicClientApplication> {
  const instance =
    await createStandardPublicClientApplication(configuration);

  const account = selectInitialAccount(instance);

  if (account) {
    instance.setActiveAccount(account);
  }

  return instance;
}
```

If multiple accounts are present, show an account-selection UI. Do not silently select an arbitrary account.

## 2. Create an external authentication store

```ts
import type {
  AccountInfo,
  IPublicClientApplication,
} from "@azure/msal-browser";

export type AuthenticationStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "logging-out"
  | "error";

export type AuthenticationSnapshot = Readonly<{
  status: AuthenticationStatus;
  account: AccountInfo | null;
}>;

export type AuthenticationStore = Readonly<{
  getSnapshot(): AuthenticationSnapshot;
  subscribe(listener: () => void): () => void;
  refresh(): void;
  setLoggingOut(): void;
}>;

export function createAuthenticationStore(
  instance: IPublicClientApplication,
): AuthenticationStore {
  let snapshot: AuthenticationSnapshot = {
    status: "initializing",
    account: null,
  };

  const listeners = new Set<() => void>();

  function publish(next: AuthenticationSnapshot): void {
    snapshot = next;

    for (const listener of listeners) {
      listener();
    }
  }

  function refresh(): void {
    const account = instance.getActiveAccount();

    publish({
      status: account ? "authenticated" : "unauthenticated",
      account,
    });
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    setLoggingOut() {
      publish({
        status: "logging-out",
        account: null,
      });
    },
  };
}
```

## 3. Register MSAL events once

```ts
import {
  EventType,
  type AccountInfo,
  type EventMessage,
  type IPublicClientApplication,
} from "@azure/msal-browser";

import type {
  AuthenticationStore,
} from "./createAuthenticationStore";

export function registerMsalEvents(
  instance: IPublicClientApplication,
  store: AuthenticationStore,
): () => void {
  const callbackId = instance.addEventCallback(
    (event: EventMessage) => {
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        const account = event.payload as AccountInfo;
        instance.setActiveAccount(account);
        store.refresh();
        return;
      }

      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        store.refresh();
        return;
      }

      if (
        event.eventType === EventType.ACTIVE_ACCOUNT_CHANGED
      ) {
        store.refresh();
      }
    },
  );

  return () => {
    if (callbackId) {
      instance.removeEventCallback(callbackId);
    }
  };
}
```

MSAL Browser v5 automatically enables account-storage events. Do not call the removed `enableAccountStorageEvents()` method.

## 4. Create React bindings for the external store

```tsx
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type {
  AuthenticationSnapshot,
  AuthenticationStore,
} from "./createAuthenticationStore";

const AuthenticationStoreContext =
  createContext<AuthenticationStore | null>(null);

export function AuthenticationStoreProvider({
  store,
  children,
}: {
  store: AuthenticationStore;
  children: ReactNode;
}) {
  return (
    <AuthenticationStoreContext.Provider value={store}>
      {children}
    </AuthenticationStoreContext.Provider>
  );
}

export function useAuthenticationSnapshot(): AuthenticationSnapshot {
  const store = useContext(AuthenticationStoreContext);

  if (!store) {
    throw new Error(
      "AuthenticationStoreProvider is missing",
    );
  }

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
```

The same store object can be injected into each independent child React root.

## 5. Bootstrap before rendering

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";

import { App } from "./app/App";
import { createMsalConfiguration } from "./auth/authConfig";
import { createAuthenticationStore } from "./auth/createAuthenticationStore";
import { createMsalInstance } from "./auth/createMsalInstance";
import { registerMsalEvents } from "./auth/registerMsalEvents";
import { AuthenticationStoreProvider } from "./auth/AuthenticationStoreProvider";
import { loadRuntimeConfig } from "./configuration/loadRuntimeConfig";

async function bootstrap(): Promise<void> {
  const runtimeConfig = await loadRuntimeConfig();
  const msalConfiguration =
    createMsalConfiguration(runtimeConfig);
  const msalInstance =
    await createMsalInstance(msalConfiguration);
  const authenticationStore =
    createAuthenticationStore(msalInstance);

  const unregisterMsalEvents = registerMsalEvents(
    msalInstance,
    authenticationStore,
  );

  authenticationStore.refresh();

  window.addEventListener(
    "pagehide",
    unregisterMsalEvents,
    { once: true },
  );

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element was not found");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <AuthenticationStoreProvider
          store={authenticationStore}
        >
          <App />
        </AuthenticationStoreProvider>
      </MsalProvider>
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error("Application bootstrap failed", error);
});
```

Avoid starting API profile requests before MSAL initialization and account restoration are complete.
