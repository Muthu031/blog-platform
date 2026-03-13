# ProjectPal - Quick Reference Guide

A concise reference guide for roles, permissions, and access control patterns.

---

## Quick Role Comparison

| Aspect | Owner | Admin | Member | Guest |
|--------|-------|-------|--------|-------|
| **Can Create Org** | ✅ | ❌ | ❌ | ❌ |
| **Can Delete Org** | ✅ | ❌ | ❌ | ❌ |
| **Can Manage Billing** | ✅ | ❌ | ❌ | ❌ |
| **Can Invite Members** | ✅ | ✅ | ❌ | ❌ |
| **Can Change Roles** | ✅ | ❌ | ❌ | ❌ |
| **Can Create Projects** | ✅ | ✅ | ✅ | ❌ |
| **Can Delete Projects** | ✅ | ✅ | ❌ | ❌ |
| **Can Create Tasks** | ✅ | ✅ | ✅ | ❌ |
| **Can Delete Tasks** | ✅ | ✅ | ❌ | ❌ |
| **Can Assign Tasks** | ✅ | ✅ | ✅ | ❌ |
| **Can Comment** | ✅ | ✅ | ✅ | ✅ |
| **Can View Audit Logs** | ✅ | ✅ | ✅ | ❌ |
| **Can Access Billing** | ✅ | ❌ | ❌ | ❌ |
| **API Rate Limit** | 10K/hr | 5K/hr | 1K/hr | 100/hr |

---

## Role Hierarchy

```
        OWNER (Highest)
          ↓ delegates to
        ADMIN
          ↓ manages
       MEMBER
          ↓ supervises
       GUEST (Lowest)

Characteristics:
- Higher roles have all lower permissions + additional ones
- Lower roles cannot access higher role features
- No role skipping (can't go GUEST → ADMIN directly)
- Role changes require OWNER intervention
```

---

## Access Control Checklist

✅ **Every Protected Endpoint Must Have:**
- [ ] Authentication check (JWT valid)
- [ ] Tenant guard (user in org)
- [ ] Permission/role check (required access level)
- [ ] Audit logging (action recorded)
- [ ] Error responses (401, 403, 404 only)

✅ **Every Database Query Must:**
- [ ] Filter by organization_id
- [ ] Filter by user_id when applicable
- [ ] Use parameterized queries (no SQL injection)
- [ ] Check indexes on common filters

✅ **Every Feature Must:**
- [ ] Define required role/permission
- [ ] Document access restrictions
- [ ] Test all role combinations
- [ ] Verify cross-tenant isolation

---

## 16 Core Permissions

### Organization (3)
1. `create:organization` - Create new org
2. `update:organization` - Modify org settings
3. `delete:organization` - Delete entire org

### Members (2)
4. `manage:members` - Add/remove/change roles
5. `invite:members` - Send invitations

### Projects (4)
6. `create:project` - Create projects
7. `update:project` - Edit project settings
8. `delete:project` - Delete projects
9. `manage:project` - Manage project config

### Tasks (4)
10. `create:task` - Create tasks
11. `update:task` - Modify tasks
12. `delete:task` - Delete tasks
13. `assign:task` - Assign to users

### Comments (3)
14. `create:comment` - Add comments
15. `update:comment` - Edit comments
16. `delete:comment` - Delete comments

---

## Middleware Stack Visual

```
Every API request goes through:

Request → [Auth] → [Tenant] → [Permission] → [Role] → [Handler] → Response
          (401)    (403)      (403)         (403)

Auth Middleware:
  Input: Request with JWT token
  Output: User attached to request (or 401 error)
  Checks: Token signature, expiration

Tenant Guard Middleware:
  Input: User + Organization ID from URL
  Output: User's role in that org (or 403 error)
  Checks: Organization membership in DB

Permission Check Middleware:
  Input: Required permission + User's permissions array
  Output: Allow or deny (403 error)
  Checks: req.user.permissions.includes(required)

Role Check Middleware:
  Input: Required role(s) + User's role
  Output: Allow or deny (403 error)
  Checks: req.user.role in allowedRoles

Route Handler:
  Input: Authenticated, authorized user
  Output: Business logic result

For example, DELETE /projects/:id might be:
  router.delete('/:id',
    authenticate,           // Must be logged in
    isOrgMember,           // Must be in organization
    checkRole(OWNER, ADMIN), // Must be owner or admin
    checkPermission(DELETE_PROJECT), // Must have permission
    deleteProjectHandler    // Execute business logic
  );
```

---

## Common Use Cases

### Invite a New Team Member
1. Admin/Owner calls: `POST /api/organizations/org-123/members/invite`
2. System verifies: Admin has `invite:members` permission
3. System creates: Invitation record + sends email
4. User clicks email link
5. System creates: OrganizationMember with MEMBER role
6. Permission check: Member has `create:task`, `create:comment`

### Promote Member to Admin
1. Owner calls: `PUT /api/organizations/org-123/members/user-456/role`
2. System verifies: Owner has `manage:members` permission
3. System updates: OrganizationMember.role = "admin"
4. Audit log: Captures "role changed from member to admin"
5. User gets new permissions on next token refresh
6. New token includes: all ADMIN permissions

### Create and Assign Task
1. Admin calls: `POST /api/organizations/org-123/projects/proj-456/tasks`
2. System verifies: Admin has `create:task` permission
3. Task created with: created_by = admin-user-id
4. Admin calls: `PUT /tasks/task-789` with assignedTo = member-user-id
5. System verifies: Admin has `assign:task` permission
6. Member sees task in: "Assigned to Me"
7. Member can update status (has `update:task`)
8. Member cannot delete (no `delete:task`)

### Prevent Cross-Organization Access
1. Sarah in Org A tries: `GET /organizations/org-b/projects`
2. Tenant guard checks: Is Sarah in org-b?
3. Database query: No OrganizationMember record found
4. System returns: 403 Forbidden
5. Audit log: "Unauthorized org access attempt"

### Guest Views Task but Can't Edit
1. Client (Guest) calls: `GET /organizations/org-123/projects/proj-456/tasks/task-789`
2. System verifies: Client is GUEST
3. System checks: GUEST has implicit read access
4. Task returned: Full details (read-only)
5. Client calls: `PUT /tasks/task-789` with updated status
6. System verifies: GUEST has `update:task`?
7. Result: 403 Forbidden (GUEST can't update)

---

## Permission Denial Scenarios

| User | Action | Permission Check | Result |
|------|--------|------------------|--------|
| Guest | Create project | ❌ No `create:project` | 403 |
| Member | Delete project | ❌ No `delete:project` | 403 |
| Member | Change member role | ❌ No `manage:members` | 403 |
| Admin | Delete organization | ❌ No `delete:organization` | 403 |
| Anyone | No JWT token | ❌ Not authenticated | 401 |
| Anyone | Invalid JWT | ❌ Signature invalid | 401 |
| User A | Org B's project | ❌ Not org member | 403 |
| Logged out | Any call | ❌ Token expired | 401 |

---

## Role Selection Guide

**Choose OWNER if:**
- User created the organization
- Needs billing/subscription access
- Needs to delete organization
- Needs to manage member roles
- Needs to set org-wide policies

**Choose ADMIN if:**
- Needs to manage projects/tasks
- Needs to invite team members
- Won't manage billing/settings
- Day-to-day team lead
- Can assign tasks to others

**Choose MEMBER if:**
- Active contributor to tasks
- Creates and updates own work
- Participates in discussions
- Cannot create/delete projects
- Regular developer/designer

**Choose GUEST if:**
- External stakeholder
- Needs visibility only
- Can comment for feedback
- Should not create resources
- Contractor/client/partner

---

## Security Rules (Always Follow)

1. **Never Trust Client ID**
   - Always verify org_id from token, not URL alone
   - Always check database membership

2. **Always Filter by Organization**
   ```typescript
   // ✅ Good
   const projects = await db.project.findMany({
     where: { organizationId: req.user.orgId }
   });
   
   // ❌ Bad - no org filter!
   const projects = await db.project.findMany();
   ```

3. **Enforce at Middleware, Not Handler**
   - Check permissions BEFORE handler runs
   - Don't rely on handler checks alone

4. **Log All Access Denials**
   - Track failed auth/authz attempts
   - Helps detect attacks

5. **Validate Tokens Fresh**
   - Check expiration on every request
   - Don't cache token validity

6. **Use HTTPS Only**
   - JWT tokens in `Authorization` header
   - Cookies should be `secure` and `httpOnly`

---

## API Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK | Successfully retrieved resource |
| **201** | Created | Successfully created resource |
| **204** | No Content | Successfully deleted resource |
| **400** | Bad Request | Invalid input/validation error |
| **401** | Unauthorized | No valid JWT token |
| **403** | Forbidden | Authenticated but no permission |
| **404** | Not Found | Resource doesn't exist |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Server Error | Internal error (log it!) |

**Key distinction:**
- **401**: You are not logged in (need to login)
- **403**: You are logged in but don't have access (need higher role)

---

## Debugging Access Issues

**User gets 401 Unauthorized:**
- [ ] Check JWT token present in Authorization header
- [ ] Check token signature (correct secret)
- [ ] Check token not expired
- [ ] Check token format: `Bearer <token>`

**User gets 403 Forbidden:**
- [ ] Check user is member of organization
- [ ] Check user's current role (may have changed)
- [ ] Check permission exists in ROLE_PERMISSIONS
- [ ] Check middleware order (auth before permission)
- [ ] Check request has Organization ID in URL
- [ ] Check resource belongs to user's organization

**User sees other org's data:**
- [ ] Check queries filter by organization_id
- [ ] Check tenant guard middleware applied
- [ ] Check cross-org access attempt logged
- [ ] Check firewall/CORS rules

**Permission change not reflected:**
- [ ] Check JWT refresh (old token cached)
- [ ] Check database updated correctly
- [ ] Check ROLE_PERMISSIONS constant updated
- [ ] Check permission middleware reads current data

---

## Architecture Layers

### 1. Presentation Layer (Frontend)
- User interface
- Role-based UI rendering
- Token management
- No access control (just display)

### 2. API Layer (Backend Routes)
- Express routes
- Middleware stack
- Response formatting
- Error handling

### 3. Authorization Layer (Middleware)
- Auth verification (JWT)
- Tenant verification (org membership)
- Permission checking (RBAC)
- **Most critical layer**

### 4. Business Logic Layer (Handlers)
- Process requests
- Interact with database
- Assume authorization passed
- Log actions

### 5. Data Layer (Database)
- Store users, orgs, members
- Store resources (projects, tasks)
- Store audit logs
- Query filtering by org

---

## Terminology

| Term | Meaning |
|------|---------|
| **Authentication** | Verifying WHO you are (login) |
| **Authorization** | Verifying WHAT you can do (permissions) |
| **RBAC** | Role-Based Access Control (users get roles, roles get permissions) |
| **JWT** | JSON Web Token (stateless auth, contains user info) |
| **Token Refresh** | Getting new JWT when old one expires |
| **Organization** | Tenant/workspace/account boundary |
| **Member** | User in an organization (with a role) |
| **Role** | OWNER/ADMIN/MEMBER/GUEST (determines permissions) |
| **Permission** | Specific action user can perform (create:task) |
| **Middleware** | Code that runs on every request |
| **Tenant Isolation** | Ensuring org A can't see org B's data |
| **Privilege Escalation** | Trying to gain higher access (prevented!) |

---

## Links to Full Documentation

- **[Roles & Responsibilities](./ROLES_AND_PERMISSIONS.md)** - Detailed role descriptions
- **[Workflows & Access Control](./WORKFLOWS_AND_ACCESS_CONTROL.md)** - Visual workflows and diagrams
- **[Architecture](./ARCHITECTURE.md)** - Full system architecture
- **Phase 2 Lessons** - Implementation tutorials in `claude/tasks/phase-2/`

---

## Template: Adding New Permission

When adding a new feature, follow this pattern:

### 1. Define Permission
```typescript
// In shared/types/roles.ts
export enum Permission {
  // ... existing
  EXPORT_REPORT = 'export:report'
}
```

### 2. Add to Appropriate Roles
```typescript
[Role.OWNER]: [
  // ... existing
  Permission.EXPORT_REPORT
],
[Role.ADMIN]: [
  // ... existing
  Permission.EXPORT_REPORT  // Admins can too
]
```

### 3. Apply Middleware
```typescript
router.post('/export',
  authenticate,
  isOrgMember,
  checkPermission(Permission.EXPORT_REPORT),
  handleExport
);
```

### 4. Test Access
- Test OWNER can access ✓
- Test ADMIN can access ✓
- Test MEMBER cannot access (403) ✓
- Test GUEST cannot access (403) ✓

---

## Common Mistakes to Avoid

❌ **Forgetting organization_id in queries**
```typescript
// BAD - gets ALL tasks
const tasks = await db.task.findMany();

// GOOD - gets only this org's tasks
const tasks = await db.task.findMany({
  where: { projectId_organizationId: req.user.orgId }
});
```

❌ **Checking permissions in handler**
```typescript
// BAD - permission check runs after handler
router.post('/create', handler); // No auth!

// GOOD - middleware checks first
router.post('/create', authenticate, checkPermission(...), handler);
```

❌ **Trusting client-provided org ID**
```typescript
// BAD - user can change orgId in request
const orgId = req.body.organizationId;

// GOOD - use org from token/database
const orgId = req.user.organizationId;
```

❌ **Caching tokens too long**
```typescript
// BAD - token cached, permission changes not reflected
const token = localStorage.getItem('token'); // 1 week old

// GOOD - refresh token regularly
if (tokenExpiringSoon()) {
  await refreshToken();
}
```

---

## Summary Table: 4 Roles × 5 Domains

```
ORGANIZATION | Owner ✓ | Admin ✓ | Member ✗ | Guest ✗ |
PROJECTS     | Owner ✓ | Admin ✓ | Member ✓ | Guest ✗ |
TASKS        | Owner ✓ | Admin ✓ | Member ✓ | Guest ✗ |
COMMENTS     | Owner ✓ | Admin ✓ | Member ✓ | Guest ✓ |
VIEW-ONLY    | Owner — | Admin — | Member — | Guest ✓ |

✓ Can create/update/delete
✗ Cannot create/update/delete
— Not applicable
```

---

**Last Updated**: March 2026  
**System**: ProjectPal Multi-Tenant SaaS  
**Architecture**: Node.js + Express + PostgreSQL + React
