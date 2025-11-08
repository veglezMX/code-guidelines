# Feature Authentication Checklist

**Feature Name:** _[Enter feature name]_  
**Developer:** _[Your name]_  
**Date:** _[Date]_  
**Related PR:** _[PR number/link]_

---

## Authentication

- [ ] Protected routes use `ProtectedRoute` wrapper
- [ ] Tokens acquired with minimal scopes (least-privilege principle)
- [ ] Silent token acquisition tried before interactive flow
- [ ] Loading states shown during authentication
- [ ] Return URL preserved for redirect after login
- [ ] Error handling implemented for auth failures

**Scopes required:** _[List scopes, e.g., api://my-api/read]_

---

## Authorization

- [ ] Roles/permissions checked **server-side** (required)
- [ ] Client-side checks used for UX only (not security)
- [ ] Fallback UI provided for unauthorized access
- [ ] Role constants used (no hardcoded strings)
- [ ] Authorization failures logged for monitoring

**Required roles:** _[List roles, e.g., Admin, User]_  
**Required permissions:** _[List permissions, e.g., can_delete_users]_

---

## Security

- [ ] No credentials hardcoded in code
- [ ] Environment variables used for configuration
- [ ] HTTPS used in production
- [ ] CORS configured correctly for API calls
- [ ] Error messages don't expose sensitive data
- [ ] Tokens not logged or exposed in console (production)
- [ ] Server-side token validation implemented

**Security notes:** _[Any special security considerations]_

---

## Testing

### Unit Tests

- [ ] Auth logic tested with mocked MSAL
- [ ] Token acquisition tested (happy path + errors)
- [ ] Role/permission checks tested
- [ ] Error handling tested

**Test files:** _[List test files]_

### Integration Tests

- [ ] API calls tested with MSW handlers
- [ ] Bearer token injection tested
- [ ] 401/403 responses handled correctly
- [ ] Token refresh tested

**Test files:** _[List test files]_

### E2E Tests

- [ ] Feature tested with dev login pattern
- [ ] Tested with different roles
- [ ] Unauthorized access tested
- [ ] Critical user flows covered

**Test files:** _[List feature files]_

---

## Code Quality

- [ ] Code follows project conventions
- [ ] TypeScript types defined
- [ ] Comments added for complex logic
- [ ] No console.logs in production code
- [ ] Linter passes with no errors
- [ ] Code reviewed by team member

**Reviewer:** _[Reviewer name]_

---

## Documentation

- [ ] Feature documented (if needed)
- [ ] API endpoints documented
- [ ] Required scopes documented
- [ ] Role requirements documented
- [ ] README updated (if needed)

**Documentation location:** _[Link to docs]_

---

## Deployment

- [ ] Environment variables configured (dev, staging, prod)
- [ ] Azure AD app registration updated (if needed)
- [ ] API permissions granted in Azure AD
- [ ] Tested in staging environment
- [ ] Rollback plan documented

**Deployment notes:** _[Any special deployment considerations]_

---

## Definition of Done

Feature is considered **done** when:

1. ✅ All checklist items above are completed
2. ✅ All tests passing (unit, integration, E2E)
3. ✅ Code reviewed and approved
4. ✅ Security review completed
5. ✅ Tested in staging environment
6. ✅ Documentation updated
7. ✅ Deployed to production successfully

---

## Notes

_[Add any additional notes, concerns, or follow-up items]_

---

**Sign-off:**

- Developer: _[Name, Date]_
- Reviewer: _[Name, Date]_
- Security Review: _[Name, Date]_
- Deployment: _[Name, Date]_

