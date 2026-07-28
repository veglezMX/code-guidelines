# Route Protection and Child Lifecycle

## Shell authentication guard

Use a function component. The example uses redirect interaction consistently.

```tsx
import {
  InteractionType,
} from "@azure/msal-browser";
import {
  MsalAuthenticationTemplate,
} from "@azure/msal-react";
import { Outlet } from "react-router";

const loginRequest = {
  scopes: ["openid", "profile"],
} as const;

function AuthenticationLoading() {
  return <p aria-busy="true">Signing in…</p>;
}

function AuthenticationFailure({
  error,
}: {
  error: Error;
}) {
  return (
    <main role="alert">
      <h1>Authentication failed</h1>
      <p>{error.message}</p>
    </main>
  );
}

export function RequireAuthentication() {
  return (
    <MsalAuthenticationTemplate
      interactionType={InteractionType.Redirect}
      authenticationRequest={loginRequest}
      loadingComponent={AuthenticationLoading}
      errorComponent={AuthenticationFailure}
    >
      <Outlet />
    </MsalAuthenticationTemplate>
  );
}
```

## Portal application-access guard

```tsx
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import {
  usePortalAuthorization,
} from "./PortalAuthorizationProvider";

export function RequireApplicationAccess({
  applicationId,
}: {
  applicationId: string;
}) {
  const location = useLocation();
  const authorization = usePortalAuthorization();

  if (authorization.status === "loading") {
    return <p aria-busy="true">Checking access…</p>;
  }

  if (authorization.status === "error") {
    return <p role="alert">Access check failed.</p>;
  }

  if (!authorization.canLaunch(applicationId)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
```

## Route composition

```tsx
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signed-out" element={<SignedOutPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        <Route element={<RequireAuthentication />}>
          <Route element={<ShellLayout />}>
            <Route path="/" element={<PortalHomePage />} />

            <Route
              element={
                <RequireApplicationAccess
                  applicationId="child0"
                />
              }
            >
              <Route
                path="/child0/*"
                element={
                  <ChildApplicationHost
                    applicationId="child0"
                  />
                }
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

The shell is the sole owner of browser history.

## Child runtime contract

```ts
export type ChildRuntimeContext = Readonly<{
  applicationId: string;
  authStore: AuthenticationStore;
  http: AuthorizedHttpClient;
  navigation: NavigationPort;
  telemetry: TelemetryPort;
  initialPath: string;
}>;

export type UnmountChild = () => void;

export type MicroFrontendModule = Readonly<{
  mount(
    container: HTMLElement,
    context: ChildRuntimeContext,
  ): Promise<UnmountChild>;
}>;
```

## Child mount function

```tsx
import { createRoot } from "react-dom/client";

export async function mountChild0(
  container: HTMLElement,
  context: ChildRuntimeContext,
): Promise<UnmountChild> {
  const root = createRoot(container);

  root.render(
    <AuthenticationStoreProvider store={context.authStore}>
      <RuntimeProvider value={context}>
        <Child0Application />
      </RuntimeProvider>
    </AuthenticationStoreProvider>,
  );

  return () => {
    root.unmount();
  };
}
```

## Shell host

```tsx
import {
  useEffect,
  useRef,
  useState,
} from "react";

export function ChildApplicationHost({
  applicationId,
}: {
  applicationId: "child0";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");

  useEffect(() => {
    let disposed = false;
    let unmount: UnmountChild | undefined;

    async function activate(): Promise<void> {
      try {
        const module = await loadChildModule(applicationId);
        const container = containerRef.current;

        if (disposed || !container) {
          return;
        }

        unmount = await module.mount(
          container,
          createChildRuntime(applicationId),
        );

        if (!disposed) {
          setStatus("ready");
        }
      } catch (error: unknown) {
        shellTelemetry.captureException(error, {
          applicationId,
          operation: "child-mount",
        });

        if (!disposed) {
          setStatus("failed");
        }
      }
    }

    void activate();

    return () => {
      disposed = true;
      unmount?.();
    };
  }, [applicationId]);

  if (status === "failed") {
    return <ChildLoadFailure />;
  }

  return (
    <>
      {status === "loading" && (
        <p aria-busy="true">Loading application…</p>
      )}
      <div ref={containerRef} />
    </>
  );
}
```

Logout coordination must unmount all registered children before showing a signed-out state.
