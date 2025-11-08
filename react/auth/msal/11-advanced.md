# Advanced — MSAL for React

**Goal:** Handle complex authentication scenarios including B2C, multi-tenant, and custom configurations.

---

## Azure AD B2C Implementation

### B2C vs Azure AD

| Feature | Azure AD | Azure AD B2C |
|---------|----------|--------------|
| **Target Users** | Employees, internal | Customers, external |
| **User Management** | Managed by org | Self-service registration |
| **Identity Providers** | Azure AD only | Social (Google, Facebook), custom |
| **Customization** | Limited | Extensive (UI, flows) |
| **Pricing** | Per user | Per authentication |

---

## B2C Tenant Setup

### Create B2C Tenant

1. Go to [Azure Portal](https://portal.azure.com)
2. Create resource → **Azure Active Directory B2C**
3. Create new tenant or link existing
4. Note your tenant name: `{tenant}.onmicrosoft.com`

### Register Application

1. In B2C tenant → **App registrations** → **New registration**
2. Name: Your app name
3. Redirect URI: `https://app.example.com/auth/callback`
4. Register

---

## B2C User Flows

### Available User Flows

| Flow | Purpose | When to Use |
|------|---------|-------------|
| **Sign up and sign in** | Combined registration + login | Most common, recommended |
| **Sign in** | Login only | Existing users only |
| **Sign up** | Registration only | Separate registration flow |
| **Password reset** | Self-service password reset | User forgot password |
| **Profile editing** | Update profile | User wants to edit info |

### Create Sign Up/Sign In Flow

1. B2C tenant → **User flows** → **New user flow**
2. Select **Sign up and sign in**
3. Version: **Recommended**
4. Name: `B2C_1_signupsignin`
5. Identity providers:
   - ✅ Email signup
   - ✅ Google (if configured)
   - ✅ Facebook (if configured)
6. User attributes to collect:
   - Display Name
   - Email Address
   - Given Name
   - Surname
7. Application claims to return:
   - Display Name
   - Email Addresses
   - Given Name
   - Surname
   - User's Object ID
8. Create

### Create Password Reset Flow

1. **User flows** → **New user flow**
2. Select **Password reset**
3. Name: `B2C_1_passwordreset`
4. Claims to return: Email, Display Name
5. Create

### Create Profile Edit Flow

1. **User flows** → **New user flow**
2. Select **Profile editing**
3. Name: `B2C_1_profileedit`
4. Attributes users can edit: Display Name, Given Name, Surname
5. Create

---

## B2C Configuration

### B2C MSAL Config

```ts
// src/config/msalConfigB2C.ts
import { Configuration, LogLevel } from '@azure/msal-browser';

const b2cPolicies = {
  names: {
    signUpSignIn: 'B2C_1_signupsignin',
    forgotPassword: 'B2C_1_passwordreset',
    editProfile: 'B2C_1_profileedit',
  },
  authorities: {
    signUpSignIn: {
      authority: `https://${import.meta.env.VITE_B2C_TENANT}.b2clogin.com/${import.meta.env.VITE_B2C_TENANT}.onmicrosoft.com/B2C_1_signupsignin`,
    },
    forgotPassword: {
      authority: `https://${import.meta.env.VITE_B2C_TENANT}.b2clogin.com/${import.meta.env.VITE_B2C_TENANT}.onmicrosoft.com/B2C_1_passwordreset`,
    },
    editProfile: {
      authority: `https://${import.meta.env.VITE_B2C_TENANT}.b2clogin.com/${import.meta.env.VITE_B2C_TENANT}.onmicrosoft.com/B2C_1_profileedit`,
    },
  },
  authorityDomain: `${import.meta.env.VITE_B2C_TENANT}.b2clogin.com`,
};

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_B2C_CLIENT_ID!,
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: [b2cPolicies.authorityDomain],
    redirectUri: window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin + '/login',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(`[MSAL][${LogLevel[level]}] ${message}`);
      },
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Error,
      piiLoggingEnabled: false,
    },
  },
};

export { b2cPolicies };

export const loginRequest = {
  scopes: ['openid', 'profile'],
};
```

### B2C Login with Social Providers

```tsx
import { useMsal } from '@azure/msal-react';
import { loginRequest, b2cPolicies } from '../config/msalConfigB2C';

function B2CLogin() {
  const { instance } = useMsal();
  
  const handleLogin = () => {
    // B2C will show configured identity providers
    instance.loginRedirect(loginRequest);
  };
  
  return (
    <div>
      <h2>Sign In</h2>
      <button onClick={handleLogin}>
        Sign in with Email or Social
      </button>
    </div>
  );
}
```

---

## B2C Password Reset

### Handle Password Reset Flow

```tsx
import { useMsal } from '@azure/msal-react';
import { useEffect } from 'react';
import { b2cPolicies } from '../config/msalConfigB2C';

function B2CAuthHandler() {
  const { instance } = useMsal();
  
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        
        // Check if user clicked "Forgot password"
        if (response === null && window.location.hash.includes('AADB2C90118')) {
          // Trigger password reset flow
          instance.loginRedirect({
            authority: b2cPolicies.authorities.forgotPassword.authority,
            scopes: ['openid', 'profile'],
          });
        }
      } catch (error: any) {
        // Handle password reset cancellation
        if (error.errorMessage?.includes('AADB2C90091')) {
          console.log('User cancelled password reset');
          // Redirect back to login
          window.location.href = '/login';
        }
      }
    };
    
    handleRedirect();
  }, [instance]);
  
  return null;
}
```

### B2C Error Codes

| Error Code | Meaning | Action |
|------------|---------|--------|
| `AADB2C90118` | User clicked "Forgot password" | Trigger password reset flow |
| `AADB2C90091` | User cancelled flow | Redirect to login |
| `AADB2C90077` | User's session expired | Re-authenticate |

---

## B2C Profile Editing

### Trigger Profile Edit Flow

```tsx
function EditProfileButton() {
  const { instance } = useMsal();
  
  const handleEditProfile = () => {
    instance.loginRedirect({
      authority: b2cPolicies.authorities.editProfile.authority,
      scopes: ['openid', 'profile'],
    });
  };
  
  return <button onClick={handleEditProfile}>Edit Profile</button>;
}
```

---

## B2C Custom Branding

### Customize UI

1. B2C tenant → **User flows** → Select flow
2. **Page layouts** → Select page
3. **Custom page content**:
   - Upload HTML/CSS to Azure Blob Storage
   - Set URL: `https://yourstorage.blob.core.windows.net/b2c/custom.html`
4. Enable CORS on blob storage

### Custom HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sign In</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      max-width: 400px;
      margin: 100px auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="api"></div>
  </div>
</body>
</html>
```

---

## B2C Social Identity Providers

### Add Google

1. B2C tenant → **Identity providers** → **New OpenID Connect provider**
2. Name: Google
3. Metadata URL: `https://accounts.google.com/.well-known/openid-configuration`
4. Client ID: From Google Cloud Console
5. Client secret: From Google Cloud Console
6. Scope: `openid email profile`
7. Response type: `code`
8. Save

### Add Facebook

1. **Identity providers** → **New OAuth 2.0 provider**
2. Name: Facebook
3. Client ID: From Facebook App
4. Client secret: From Facebook App
5. Scope: `email public_profile`
6. Authorization endpoint: `https://www.facebook.com/v12.0/dialog/oauth`
7. Token endpoint: `https://graph.facebook.com/v12.0/oauth/access_token`
8. Save

### Enable in User Flow

1. **User flows** → Select flow
2. **Identity providers**
3. ✅ Check Google
4. ✅ Check Facebook
5. Save

---

## B2C Multi-Factor Authentication

### Enable MFA

1. **User flows** → Select flow
2. **Properties** → **Multifactor authentication**
3. Method: SMS, Email, or Authenticator app
4. Enforcement:
   - **Always on**: Required for all users
   - **Conditional**: Based on risk
5. Save

### Handle MFA in Code

```tsx
// MFA is handled automatically by B2C
// No code changes needed in your app
// User will be prompted during authentication
```

---

## Custom Policies vs User Flows

### When to Use Each

| Use Case | User Flows | Custom Policies |
|----------|-----------|-----------------|
| **Standard scenarios** | ✅ Recommended | Overkill |
| **Social login** | ✅ Built-in | Possible |
| **MFA** | ✅ Built-in | Possible |
| **Complex logic** | ❌ Limited | ✅ Full control |
| **Custom claims** | ❌ Limited | ✅ Full control |
| **API integration** | ❌ No | ✅ Yes |
| **Maintenance** | Easy | Complex |

### Custom Policy Example (Advanced)

```xml
<!-- TrustFrameworkBase.xml -->
<TrustFrameworkPolicy 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06"
  PolicySchemaVersion="0.3.0.0"
  TenantId="yourtenant.onmicrosoft.com"
  PolicyId="B2C_1A_TrustFrameworkBase">
  
  <!-- Custom claims, transformations, and orchestration -->
  
</TrustFrameworkPolicy>
```

**Note:** Custom policies are complex. Use user flows unless you have specific requirements.

---

## Multiple Tenants

### Tenant Routing by Domain

```ts
// src/config/msalConfigMultiTenant.ts
const tenantConfigs = {
  'tenant1.example.com': {
    clientId: import.meta.env.VITE_TENANT1_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT1_ID}`,
  },
  'tenant2.example.com': {
    clientId: import.meta.env.VITE_TENANT2_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT2_ID}`,
  },
};

export function getMsalConfig(): Configuration {
  const domain = window.location.hostname;
  const config = tenantConfigs[domain];
  
  if (!config) {
    throw new Error(`No tenant configuration for domain: ${domain}`);
  }
  
  return {
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: window.location.origin + '/auth/callback',
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  };
}
```

### Dynamic Authority Selection

```tsx
function LoginPage() {
  const { instance } = useMsal();
  const [selectedTenant, setSelectedTenant] = useState('');
  
  const handleLogin = () => {
    const authority = `https://login.microsoftonline.com/${selectedTenant}`;
    
    instance.loginRedirect({
      authority,
      scopes: ['openid', 'profile'],
    });
  };
  
  return (
    <div>
      <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
        <option value="">Select Tenant</option>
        <option value="tenant1-id">Tenant 1</option>
        <option value="tenant2-id">Tenant 2</option>
      </select>
      <button onClick={handleLogin}>Sign In</button>
    </div>
  );
}
```

---

## Multiple MSAL Instances

### When to Use Multiple Instances

- **Micro-frontends**: Each app has own instance
- **Split apps**: Different auth requirements
- **Testing**: Separate test instance

### Create Multiple Instances

```ts
// src/config/msalInstances.ts
import { PublicClientApplication } from '@azure/msal-browser';

// Primary instance
export const primaryMsalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_PRIMARY_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_PRIMARY_TENANT_ID}`,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
});

// Secondary instance (e.g., for admin portal)
export const adminMsalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_ADMIN_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ADMIN_TENANT_ID}`,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
});
```

### Usage

```tsx
// Primary app
<MsalProvider instance={primaryMsalInstance}>
  <App />
</MsalProvider>

// Admin portal
<MsalProvider instance={adminMsalInstance}>
  <AdminApp />
</MsalProvider>
```

---

## Custom Prompt Behaviors

### Available Prompts

| Prompt | Behavior | Use Case |
|--------|----------|----------|
| `none` | Silent authentication | SSO, background refresh |
| `login` | Force re-authentication | Security-sensitive actions |
| `select_account` | Show account picker | Multi-account support |
| `consent` | Request consent | Additional permissions |

### Examples

```tsx
// Force account selection
instance.loginRedirect({
  ...loginRequest,
  prompt: 'select_account',
});

// Force re-authentication
instance.loginRedirect({
  ...loginRequest,
  prompt: 'login',
});

// Request additional consent
instance.acquireTokenRedirect({
  scopes: ['api://my-api/admin'],
  prompt: 'consent',
});
```

---

## Custom Token Validation

### Add Custom Validation Logic

```ts
// src/utils/tokenValidation.ts
import { AccountInfo } from '@azure/msal-browser';

export function validateCustomClaims(account: AccountInfo): boolean {
  const claims = account.idTokenClaims as any;
  
  // Example: Validate email domain
  if (!claims.email?.endsWith('@example.com')) {
    throw new Error('Invalid email domain');
  }
  
  // Example: Validate custom claim
  if (!claims.department) {
    throw new Error('Department claim missing');
  }
  
  // Example: Validate role
  if (!claims.roles || claims.roles.length === 0) {
    throw new Error('No roles assigned');
  }
  
  return true;
}
```

### Usage

```tsx
function App() {
  const { accounts } = useMsal();
  const [validationError, setValidationError] = useState<string | null>(null);
  
  useEffect(() => {
    if (accounts[0]) {
      try {
        validateCustomClaims(accounts[0]);
      } catch (error: any) {
        setValidationError(error.message);
      }
    }
  }, [accounts]);
  
  if (validationError) {
    return <div>Validation error: {validationError}</div>;
  }
  
  return <YourApp />;
}
```

---

## Migration from B2C to Azure AD

### Migration Strategy

1. **Dual authentication**: Support both B2C and Azure AD
2. **User migration**: Export users from B2C, import to Azure AD
3. **Gradual rollout**: Migrate users in batches
4. **Cutover**: Switch to Azure AD only

### Dual Authentication Example

```ts
// Detect auth type from user input or domain
const authType = userEmail.endsWith('@company.com') ? 'azuread' : 'b2c';

const msalConfig = authType === 'azuread' 
  ? azureAdConfig 
  : b2cConfig;

const msalInstance = new PublicClientApplication(msalConfig);
```

---

## Best Practices

### ✅ Do

- Use user flows for standard scenarios
- Customize B2C UI for branding
- Enable MFA for security
- Test all user flows thoroughly
- Monitor B2C authentication metrics
- Use custom policies only when necessary
- Document tenant configurations

### ❌ Don't

- Use custom policies unnecessarily
- Forget to handle B2C error codes
- Mix B2C and Azure AD without clear strategy
- Expose tenant configuration in client code
- Skip testing social login providers

---

**← Back to:** [Security Checklist](./10-security-checklist.md)  
**Back to Index:** [Index](./00-index.md)

