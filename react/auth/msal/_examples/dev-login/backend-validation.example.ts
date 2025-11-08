/**
 * Backend Dev Token Validation Example
 * 
 * ⚠️ CRITICAL: Only validate dev tokens in test environment!
 * 
 * This file demonstrates how to validate dev tokens in your backend for E2E testing.
 * Copy this code and customize the TODO sections for your backend framework.
 */

/**
 * Express.js Example
 */

import { Request, Response, NextFunction } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// JWKS client for Azure AD token validation
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Get signing key for JWT validation
 */
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validate Azure AD Token (Production)
 */
function validateAzureToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    verify(
      token,
      getKey,
      {
        audience: process.env.CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as JwtPayload);
        }
      }
    );
  });
}

/**
 * Validate Dev Token (Test Only)
 * 
 * ⚠️ CRITICAL: Only call this in test environment!
 */
function validateDevToken(token: string): any {
  // Check if token starts with 'dev-token-'
  if (!token.startsWith('dev-token-')) {
    throw new Error('Invalid dev token format');
  }
  
  // Parse role from token
  // Format: dev-token-{role}-{timestamp}
  const parts = token.split('-');
  if (parts.length < 3) {
    throw new Error('Invalid dev token format');
  }
  
  const role = parts[2];
  
  // TODO: Customize claims for your application
  return {
    sub: `dev-user-${role}`,
    name: `Test ${role}`,
    email: `test-${role.toLowerCase()}@example.com`,
    preferred_username: `test-${role.toLowerCase()}@example.com`,
    roles: [role],
    // Add custom claims as needed
    // department: 'Engineering',
    // permissions: ['read', 'write'],
  };
}

/**
 * Authentication Middleware
 * 
 * Validates Bearer token from Authorization header.
 * Uses dev token validation in test environment, Azure AD validation in production.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  // Check for Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    let user: any;
    
    // ⚠️ CRITICAL: Only use dev tokens in test environment
    if (process.env.NODE_ENV === 'test' && token.startsWith('dev-token-')) {
      console.log('[Auth] Validating dev token (test mode)');
      user = validateDevToken(token);
    } else {
      // Production: Validate real Azure AD token
      console.log('[Auth] Validating Azure AD token');
      user = await validateAzureToken(token);
    }
    
    // Attach user to request
    (req as any).user = user;
    
    // TODO: Log successful authentication
    // logger.info('User authenticated', { userId: user.sub, roles: user.roles });
    
    next();
  } catch (error) {
    console.error('[Auth] Token validation failed:', error);
    
    // TODO: Track authentication failures
    // analytics.track('auth.validation.failed', { error: error.message });
    
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Authorization Middleware
 * 
 * Checks if user has required roles.
 * Use after authenticateToken middleware.
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: No user' });
    }
    
    const userRoles = user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      console.warn('[Auth] Access denied:', {
        userId: user.sub,
        userRoles,
        requiredRoles: roles,
      });
      
      // TODO: Track authorization failures
      // analytics.track('auth.authorization.denied', {
      //   userId: user.sub,
      //   requiredRoles: roles,
      //   userRoles,
      // });
      
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        requiredRoles: roles,
      });
    }
    
    next();
  };
}

/**
 * Usage Examples:
 * 
 * // Protected endpoint (any authenticated user)
 * app.get('/api/users', authenticateToken, (req, res) => {
 *   const user = (req as any).user;
 *   res.json({ message: `Hello, ${user.name}` });
 * });
 * 
 * // Admin-only endpoint
 * app.get('/api/admin/data', authenticateToken, requireRoles('Admin'), (req, res) => {
 *   res.json({ data: 'Admin data' });
 * });
 * 
 * // Multiple roles (any)
 * app.post('/api/moderation', authenticateToken, requireRoles('Admin', 'Moderator'), (req, res) => {
 *   res.json({ message: 'Moderation action performed' });
 * });
 */

/**
 * NestJS Example
 */

/*
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    
    const token = authHeader.substring(7);
    
    try {
      let user: any;
      
      // Dev token validation in test mode
      if (process.env.NODE_ENV === 'test' && token.startsWith('dev-token-')) {
        user = validateDevToken(token);
      } else {
        // Azure AD token validation
        user = await validateAzureToken(token);
      }
      
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

// Usage:
// @UseGuards(AuthGuard)
// @Get('users')
// getUsers(@Request() req) {
//   return { user: req.user };
// }
*/

/**
 * FastAPI (Python) Example
 */

/*
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

security = HTTPBearer()

def validate_dev_token(token: str) -> dict:
    """Validate dev token (test only)"""
    if not token.startswith('dev-token-'):
        raise ValueError('Invalid dev token format')
    
    parts = token.split('-')
    if len(parts) < 3:
        raise ValueError('Invalid dev token format')
    
    role = parts[2]
    
    return {
        'sub': f'dev-user-{role}',
        'name': f'Test {role}',
        'email': f'test-{role.lower()}@example.com',
        'roles': [role],
    }

async def authenticate_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Authenticate token"""
    token = credentials.credentials
    
    try:
        # Dev token in test mode
        if os.getenv('ENV') == 'test' and token.startswith('dev-token-'):
            return validate_dev_token(token)
        
        # Azure AD token in production
        # ... validate Azure AD token ...
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token',
        )

# Usage:
# @app.get('/api/users')
# async def get_users(user: dict = Depends(authenticate_token)):
#     return {'user': user}
*/

/**
 * Environment Configuration
 * 
 * TODO: Set these environment variables
 */

/*
# .env.test
NODE_ENV=test
CLIENT_ID=your-client-id
TENANT_ID=your-tenant-id

# .env.production
NODE_ENV=production
CLIENT_ID=your-production-client-id
TENANT_ID=your-production-tenant-id
*/

/**
 * Security Checklist
 * 
 * ✅ Dev tokens only validated in test environment
 * ✅ Production uses real Azure AD validation
 * ✅ Environment variable checks in place
 * ✅ Token format validation
 * ✅ Role-based authorization
 * ✅ Logging and monitoring
 * ❌ Never deploy with NODE_ENV=test
 * ❌ Never accept dev tokens in production
 */

export default { authenticateToken, requireRoles };

