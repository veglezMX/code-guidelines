/**
 * Feature Flag Guard Example
 * 
 * Demonstrates role-based and claims-based feature flags.
 * Copy this file and customize the TODO sections for your application.
 */

import React, { useMemo } from 'react';
import { useMsal } from '@azure/msal-react';

/**
 * Feature Flag Component
 * 
 * Conditionally renders children based on roles, permissions, or custom logic.
 */
interface FeatureFlagProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean;
  customCheck?: (claims: any) => boolean;
  fallback?: React.ReactNode;
}

export function FeatureFlag({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAll = false,
  customCheck,
  fallback = null,
}: FeatureFlagProps) {
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as any;
  
  const hasAccess = useMemo(() => {
    if (!claims) return false;
    
    // Check custom logic first
    if (customCheck && !customCheck(claims)) {
      return false;
    }
    
    // Check roles
    if (requiredRoles.length > 0) {
      const userRoles = claims.roles || [];
      const hasRole = requireAll
        ? requiredRoles.every(role => userRoles.includes(role))
        : requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) return false;
    }
    
    // Check permissions
    if (requiredPermissions.length > 0) {
      const userPermissions = claims.permissions || [];
      const hasPermission = requireAll
        ? requiredPermissions.every(perm => userPermissions.includes(perm))
        : requiredPermissions.some(perm => userPermissions.includes(perm));
      
      if (!hasPermission) return false;
    }
    
    return true;
  }, [claims, requiredRoles, requiredPermissions, requireAll, customCheck]);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Usage Examples:
 * 
 * // Show admin panel only to admins
 * <FeatureFlag requiredRoles={['Admin']}>
 *   <AdminPanel />
 * </FeatureFlag>
 * 
 * // Show delete button to admins or moderators
 * <FeatureFlag requiredRoles={['Admin', 'Moderator']}>
 *   <button>Delete</button>
 * </FeatureFlag>
 * 
 * // Show feature to users with specific permission
 * <FeatureFlag requiredPermissions={['can_delete_users']}>
 *   <button>Delete User</button>
 * </FeatureFlag>
 * 
 * // Require all roles
 * <FeatureFlag requiredRoles={['Admin', 'SuperUser']} requireAll>
 *   <SuperAdminPanel />
 * </FeatureFlag>
 * 
 * // With fallback UI
 * <FeatureFlag 
 *   requiredRoles={['Premium']}
 *   fallback={<UpgradeToPremium />}
 * >
 *   <PremiumFeatures />
 * </FeatureFlag>
 * 
 * // Custom logic
 * <FeatureFlag 
 *   customCheck={(claims) => claims.email?.endsWith('@company.com')}
 * >
 *   <InternalFeature />
 * </FeatureFlag>
 */

/**
 * Hook: useFeatureFlag
 * 
 * Returns boolean indicating if user has access to feature.
 * TODO: Use this in components for conditional logic
 */
export function useFeatureFlag(
  requiredRoles: string[] = [],
  requiredPermissions: string[] = [],
  requireAll = false
): boolean {
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as any;
  
  return useMemo(() => {
    if (!claims) return false;
    
    // Check roles
    if (requiredRoles.length > 0) {
      const userRoles = claims.roles || [];
      const hasRole = requireAll
        ? requiredRoles.every(role => userRoles.includes(role))
        : requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) return false;
    }
    
    // Check permissions
    if (requiredPermissions.length > 0) {
      const userPermissions = claims.permissions || [];
      const hasPermission = requireAll
        ? requiredPermissions.every(perm => userPermissions.includes(perm))
        : requiredPermissions.some(perm => userPermissions.includes(perm));
      
      if (!hasPermission) return false;
    }
    
    return true;
  }, [claims, requiredRoles, requiredPermissions, requireAll]);
}

/**
 * Hook: useUserRoles
 * 
 * Returns user roles and helper functions.
 */
export function useUserRoles() {
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as any;
  
  return useMemo(() => {
    const roles = claims?.roles || [];
    
    return {
      roles,
      hasRole: (role: string) => roles.includes(role),
      hasAnyRole: (requiredRoles: string[]) => 
        requiredRoles.some(r => roles.includes(r)),
      hasAllRoles: (requiredRoles: string[]) => 
        requiredRoles.every(r => roles.includes(r)),
      isAdmin: roles.includes('Admin'),
      isUser: roles.includes('User'),
      isModerator: roles.includes('Moderator'),
      // TODO: Add your custom role checks
    };
  }, [claims]);
}

/**
 * Hook: useUserPermissions
 * 
 * Returns user permissions and helper functions.
 */
export function useUserPermissions() {
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as any;
  
  return useMemo(() => {
    const permissions = claims?.permissions || [];
    
    return {
      permissions,
      hasPermission: (permission: string) => permissions.includes(permission),
      hasAnyPermission: (requiredPermissions: string[]) =>
        requiredPermissions.some(p => permissions.includes(p)),
      hasAllPermissions: (requiredPermissions: string[]) =>
        requiredPermissions.every(p => permissions.includes(p)),
      // TODO: Add your custom permission checks
      canRead: permissions.includes('read'),
      canWrite: permissions.includes('write'),
      canDelete: permissions.includes('delete'),
    };
  }, [claims]);
}

/**
 * Advanced: Feature Flag with Environment Check
 * 
 * TODO: Use this to enable features per environment
 */
interface FeatureFlagWithEnvProps extends FeatureFlagProps {
  enabledInDev?: boolean;
  enabledInStaging?: boolean;
  enabledInProd?: boolean;
}

export function FeatureFlagWithEnv({
  children,
  enabledInDev = true,
  enabledInStaging = true,
  enabledInProd = true,
  ...props
}: FeatureFlagWithEnvProps) {
  const env = import.meta.env.MODE;
  
  const isEnabledInEnv = 
    (env === 'development' && enabledInDev) ||
    (env === 'staging' && enabledInStaging) ||
    (env === 'production' && enabledInProd);
  
  if (!isEnabledInEnv) {
    return <>{props.fallback}</>;
  }
  
  return <FeatureFlag {...props}>{children}</FeatureFlag>;
}

/**
 * Advanced: Feature Flag with A/B Testing
 * 
 * TODO: Integrate with your A/B testing service
 */
interface FeatureFlagWithABTestProps extends FeatureFlagProps {
  experimentId: string;
  variant: 'A' | 'B';
}

export function FeatureFlagWithABTest({
  children,
  experimentId,
  variant,
  ...props
}: FeatureFlagWithABTestProps) {
  const { accounts } = useMsal();
  const userId = accounts[0]?.localAccountId;
  
  // TODO: Replace with your A/B testing logic
  const userVariant = useMemo(() => {
    if (!userId) return 'A';
    
    // Simple hash-based assignment
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 2 === 0 ? 'A' : 'B';
  }, [userId]);
  
  if (userVariant !== variant) {
    return <>{props.fallback}</>;
  }
  
  return <FeatureFlag {...props}>{children}</FeatureFlag>;
}

/**
 * Complete Example Component
 */
export function ExampleDashboard() {
  const { hasRole, hasAnyRole } = useUserRoles();
  const { canWrite, canDelete } = useUserPermissions();
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show admin panel to admins only */}
      <FeatureFlag requiredRoles={['Admin']}>
        <section>
          <h2>Admin Panel</h2>
          <p>Admin-only content</p>
        </section>
      </FeatureFlag>
      
      {/* Show moderation tools to admins or moderators */}
      <FeatureFlag requiredRoles={['Admin', 'Moderator']}>
        <section>
          <h2>Moderation Tools</h2>
          <p>Moderation content</p>
        </section>
      </FeatureFlag>
      
      {/* Conditional button based on permission */}
      {canWrite && (
        <button>Edit</button>
      )}
      
      {canDelete && (
        <button>Delete</button>
      )}
      
      {/* Feature with fallback */}
      <FeatureFlag
        requiredRoles={['Premium']}
        fallback={
          <div>
            <p>Upgrade to Premium to access this feature</p>
            <button>Upgrade Now</button>
          </div>
        }
      >
        <section>
          <h2>Premium Features</h2>
          <p>Premium content</p>
        </section>
      </FeatureFlag>
      
      {/* Environment-specific feature */}
      <FeatureFlagWithEnv
        enabledInDev
        enabledInStaging
        enabledInProd={false}
      >
        <section>
          <h2>Beta Feature</h2>
          <p>Only visible in dev/staging</p>
        </section>
      </FeatureFlagWithEnv>
    </div>
  );
}

