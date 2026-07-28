# Cross-Tab Authentication and Logout

## Required layers

Cross-tab behavior has three related but distinct mechanisms:

1. `localStorage` allows MSAL authentication cache to be shared across same-origin tabs.
2. MSAL Browser v5 automatically emits cross-tab account events when `localStorage` is configured.
3. BroadcastChannel immediately coordinates application cleanup that MSAL does not own.

BroadcastChannel is not used to share tokens.

## Message contract

```ts
export type SessionChannelMessage =
  | Readonly<{
      type: "logout-started";
      sourceTabId: string;
      occurredAt: number;
    }>
  | Readonly<{
      type: "application-session-invalidated";
      sourceTabId: string;
      occurredAt: number;
      reason: "logout" | "account-changed";
    }>;
```

Do not include usernames, emails, claims, profile data, token strings, scopes, or API responses.

## Create a stable tab identifier

`sessionStorage` is appropriate for a non-sensitive per-tab identifier.

```ts
const TAB_ID_KEY = "company.portal.tab-id";

export function getOrCreateTabId(): string {
  const existing = sessionStorage.getItem(TAB_ID_KEY);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  sessionStorage.setItem(TAB_ID_KEY, created);
  return created;
}
```

## Create the channel

```ts
import type {
  SessionChannelMessage,
} from "./SessionChannelMessage";

const CHANNEL_NAME = "company.portal.auth.v1";

export type SessionChannel = Readonly<{
  publish(message: SessionChannelMessage): void;
  subscribe(
    listener: (message: SessionChannelMessage) => void,
  ): () => void;
  close(): void;
}>;

function isSessionMessage(
  value: unknown,
): value is SessionChannelMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as Record<string, unknown>).type;

  return (
    type === "logout-started" ||
    type === "application-session-invalidated"
  );
}

export function createSessionChannel(): SessionChannel {
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

  const listeners = new Set<
    (message: SessionChannelMessage) => void
  >();

  function handleMessage(event: MessageEvent<unknown>): void {
    if (!isSessionMessage(event.data)) {
      return;
    }

    for (const listener of listeners) {
      listener(event.data);
    }
  }

  channel?.addEventListener("message", handleMessage);

  return {
    publish(message) {
      channel?.postMessage(message);
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      channel?.removeEventListener("message", handleMessage);
      channel?.close();
      listeners.clear();
    },
  };
}
```

BroadcastChannel communication is limited to compatible same-origin browsing contexts in the same storage partition.

## Start cross-tab session coordination

```ts
import {
  EventType,
  type EventMessage,
  type IPublicClientApplication,
} from "@azure/msal-browser";

import type {
  AuthenticationStore,
} from "./createAuthenticationStore";
import type {
  SessionChannel,
} from "./createSessionChannel";

export type CrossTabCleanup = Readonly<{
  unmountChildren(): void;
  clearQueryCaches(): void;
  clearDomainProfiles(): void;
  showLogoutInProgress(): void;
}>;

export function startCrossTabSessionSync({
  instance,
  store,
  channel,
  tabId,
  cleanup,
}: {
  instance: IPublicClientApplication;
  store: AuthenticationStore;
  channel: SessionChannel;
  tabId: string;
  cleanup: CrossTabCleanup;
}): () => void {
  const unsubscribeChannel = channel.subscribe((message) => {
    if (message.sourceTabId === tabId) {
      return;
    }

    if (message.type === "logout-started") {
      store.setLoggingOut();
      cleanup.unmountChildren();
      cleanup.clearQueryCaches();
      cleanup.clearDomainProfiles();
      cleanup.showLogoutInProgress();
    }
  });

  const callbackId = instance.addEventCallback(
    (event: EventMessage) => {
      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        cleanup.unmountChildren();
        cleanup.clearQueryCaches();
        cleanup.clearDomainProfiles();
        store.refresh();
      }

      if (
        event.eventType === EventType.ACTIVE_ACCOUNT_CHANGED
      ) {
        cleanup.unmountChildren();
        cleanup.clearQueryCaches();
        cleanup.clearDomainProfiles();
        store.refresh();
      }
    },
  );

  return () => {
    unsubscribeChannel();

    if (callbackId) {
      instance.removeEventCallback(callbackId);
    }
  };
}
```

## Reliable logout initiation

For redirect logout, include the active account. Current MSAL guidance notes that cross-tab `LOGOUT_SUCCESS` is only reliably broadcast for redirect logout when the request includes an `account`.

```ts
import type {
  IPublicClientApplication,
} from "@azure/msal-browser";

import type {
  AuthenticationStore,
} from "./createAuthenticationStore";
import type {
  SessionChannel,
} from "./createSessionChannel";

export async function logoutEverywhere({
  instance,
  store,
  channel,
  tabId,
}: {
  instance: IPublicClientApplication;
  store: AuthenticationStore;
  channel: SessionChannel;
  tabId: string;
}): Promise<void> {
  const account = instance.getActiveAccount();

  store.setLoggingOut();

  channel.publish({
    type: "logout-started",
    sourceTabId: tabId,
    occurredAt: Date.now(),
  });

  if (!account) {
    window.location.replace("/signed-out");
    return;
  }

  await instance.logoutRedirect({
    account,
    postLogoutRedirectUri:
      `${window.location.origin}/signed-out`,
  });
}
```

Only the initiating tab calls `logoutRedirect()`. Other tabs react to the channel and MSAL storage event. This prevents a multi-tab redirect storm.

## Sign-in synchronization

When one tab signs in:

- The shared MSAL localStorage is updated.
- MSAL emits account events to other tabs.
- The event callback calls `getActiveAccount()` and refreshes UI.
- If no active account has been selected in the receiving tab, choose only when exactly one account exists.

```ts
import type {
  IPublicClientApplication,
} from "@azure/msal-browser";

export function restoreActiveAccount(
  instance: IPublicClientApplication,
): void {
  if (instance.getActiveAccount()) {
    return;
  }

  const accounts = instance.getAllAccounts();

  if (accounts.length === 1 && accounts[0]) {
    instance.setActiveAccount(accounts[0]);
  }
}
```

## What logout can and cannot guarantee

The application can guarantee that same-origin tabs:

- Enter a logout-in-progress state immediately.
- Unmount children.
- Clear application caches and domain profiles.
- Stop rendering protected routes.
- Observe MSAL account removal when the logout flow completes.

The application cannot guarantee that every process, browser profile, device, or unrelated application loses its identity-provider session at exactly the same instant. Those are separate identity-session concerns.

## Fallback behavior

BroadcastChannel is widely available, but the design must still remain correct without it. MSAL localStorage events are the canonical account-state mechanism. BroadcastChannel improves immediacy and application cleanup; it must not be the only way authentication state is determined.
