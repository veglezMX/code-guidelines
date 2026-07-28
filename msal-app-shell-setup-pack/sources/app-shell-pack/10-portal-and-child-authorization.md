# Portal and Child Authorization

## Portal-level endpoint

```http
GET /api/portal/v1/me/applications/child0
Authorization: Bearer <portal-api access token>
```

Example response:

```json
{
  "applicationId": "child0",
  "canLaunch": true
}
```

Frontend contract:

```ts
export type ApplicationAccess = Readonly<{
  applicationId: string;
  canLaunch: boolean;
  reason?: "not-assigned" | "disabled" | "tenant-restricted";
}>;

export async function loadApplicationAccess(
  client: AuthorizedHttpClient,
  applicationId: string,
): Promise<ApplicationAccess> {
  return await client.request<ApplicationAccess>(
    `me/applications/${encodeURIComponent(applicationId)}`,
  );
}
```

The shell may cache this result for rendering, but the Portal API owns the decision.

## Child0 domain profile endpoint

```http
GET /api/child0/v1/me
Authorization: Bearer <child0-api access token>
```

Example response:

```json
{
  "domainUserId": "usr_8291",
  "businessUnits": ["north-america"],
  "permissions": [
    "orders.read",
    "orders.create",
    "orders.approve"
  ],
  "constraints": {
    "maximumApprovalAmount": 25000
  }
}
```

Frontend contract:

```ts
export type Child0Profile = Readonly<{
  domainUserId: string;
  businessUnits: readonly string[];
  permissions: readonly string[];
  constraints: Readonly<{
    maximumApprovalAmount: number;
  }>;
}>;

export async function loadChild0Profile(
  client: AuthorizedHttpClient,
): Promise<Child0Profile> {
  return await client.request<Child0Profile>("me");
}
```

## Child permission helper

```ts
export function createPermissionSet(
  permissions: readonly string[],
) {
  const set = new Set(permissions);

  return {
    has(permission: string): boolean {
      return set.has(permission);
    },
    hasAll(required: readonly string[]): boolean {
      return required.every((permission) => set.has(permission));
    },
    hasAny(required: readonly string[]): boolean {
      return required.some((permission) => set.has(permission));
    },
  } as const;
}
```

## UI gate

```tsx
import { Navigate, Outlet } from "react-router";

export function RequireChild0Permission({
  permission,
}: {
  permission: string;
}) {
  const authorization = useChild0Authorization();

  if (!authorization.permissions.has(permission)) {
    return <Navigate to="/child0/access-denied" replace />;
  }

  return <Outlet />;
}
```

## C# API authorization

The frontend gate improves UX. The backend still enforces scope and resource policy.

The examples use ASP.NET minimal API functions rather than controller classes.

Portal API example:

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(
        builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization();
builder.Services.AddScoped<IApplicationEntitlementService,
    ApplicationEntitlementService>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet(
    "/api/portal/v1/me/applications/{applicationId}",
    async (
        string applicationId,
        ClaimsPrincipal user,
        IApplicationEntitlementService entitlements,
        CancellationToken cancellationToken) =>
    {
        var result = await entitlements.EvaluateAsync(
            user,
            applicationId,
            cancellationToken);

        return Results.Ok(result);
    })
    .RequireAuthorization(policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireScope("portal.access");
    });

app.Run();
```

Child0 resource authorization example:

```csharp
using Microsoft.AspNetCore.Authorization;

app.MapPost(
    "/api/child0/v1/orders/{orderId}/approve",
    async (
        string orderId,
        ClaimsPrincipal user,
        IAuthorizationService authorization,
        IOrdersService orders,
        CancellationToken cancellationToken) =>
    {
        var order = await orders.FindAsync(
            orderId,
            cancellationToken);

        if (order is null)
        {
            return Results.NotFound();
        }

        var decision = await authorization.AuthorizeAsync(
            user,
            order,
            "CanApproveOrder");

        if (!decision.Succeeded)
        {
            return Results.Forbid();
        }

        await orders.ApproveAsync(order, cancellationToken);
        return Results.NoContent();
    })
    .RequireAuthorization(policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireScope("child0.access");
    });
```

Keep the API composition function-oriented, while domain policies remain explicit and testable.
