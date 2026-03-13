# ProjectPal - Roles & Responsibilities

A comprehensive guide to roles, permissions, and workflows in the multi-tenant project management system.

---

## System Overview

### Architecture

ProjectPal is a **multi-tenant SaaS project management platform** designed similar to Jira, Trello, and Notion combined. The system follows these key principles:

- **Multi-Tenancy**: Data is isolated at the Organization level (tenant boundary)
- **Role-Based Access Control (RBAC)**: Four-tier role hierarchy with granular permissions
- **Tenant Isolation**: All queries are scoped to organization and verified at middleware level
- **Hierarchical Structure**: Organizations → Projects → Boards → Columns → Tasks

### Domain Model

```
┌─────────────────────────────────┐
│   Global Users Database         │
│ (Email, Password, Profile)      │
└──────────────┬──────────────────┘
               │
               ├── Can join multiple organizations
               ├── Maintains separate role per organization
               └── Has different permissions in each org
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │   Org 1  │  │   Org 2  │  │   Org 3  │
    │ (Tenant) │  │ (Tenant) │  │ (Tenant) │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │             │
    ┌────┴──────┐ ┌────┴──────┐ ┌────┴──────┐
    │ Projects  │ │ Projects  │ │ Projects  │
    │ (isolated)│ │ (isolated)│ │ (isolated)│
    └────┬──────┘ └────┬──────┘ └────┬──────┘
         │             │             │
    ┌────┴──────┐
    │ Boards    │
    │ (Kanban)  │
    └────┬──────┘
         │
    ┌────┴──────────────┐
    │ Columns & Tasks   │
    │ Comments, Files   │
    │ Activity Logs     │
    └───────────────────┘
```

### How the System Works

1. **User Registers**: Creates a global user account with email/password
2. **User Joins Organization**: Via invitation or direct signup (if org allows)
3. **Role Assignment**: User is assigned a role (Owner, Admin, Member, Guest) within that organization
4. **Permission Inheritance**: Role determines what the user can do in that organization
5. **Resource Access**: All resources (projects, tasks) are scoped to the organization
6. **Audit Trail**: All actions are logged with user, timestamp, and changes

### Workflow Between Roles

```
                    USER LIFECYCLE
                    
1. REGISTRATION
   ├─ User creates account (global)
   └─ Gets activated after email verification

2. INVITATION / JOINING
   ├─ Owner/Admin invites user to organization
   ├─ User receives email with acceptance link
   └─ User joins organization with assigned role

3. ROLE ASSIGNMENT
   ├─ Owner assigns initial role
   ├─ Admin can modify member roles (except owner)
   └─ Roles: Owner → Admin → Member → Guest

4. PERMISSION ENFORCEMENT
   ├─ Every API request checked for:
   │  ├─ Authentication (JWT token valid)
   │  ├─ Tenant membership (user in organization)
   │  ├─ Role verification (user has required role)
   │  └─ Permission validation (permission in role.permissions)
   └─ If any check fails → 403 Forbidden

5. RESOURCE EXECUTION
   ├─ Create: Must have CREATE_X permission
   ├─ Read: Must have access to organization
   ├─ Update: Must have UPDATE_X permission
   └─ Delete: Must have DELETE_X permission
```

### Access Control Implementation (RBAC)

The system implements **middleware-based RBAC** with the following layers:

1. **Authentication Middleware**
   - Validates JWT token from request headers
   - Extracts user ID, email from token
   - Attaches user to request object
   - Returns 401 if token invalid/missing

2. **Tenant Guard Middleware**
   - Validates user is member of organization
   - Verifies organization_id from URL parameter
   - Checks OrganizationMember record exists
   - Attaches user's role to request
   - Returns 403 if not a member

3. **Permission Check Middleware**
   - Verifies user has specific permission
   - Compares token permission against required permission
   - Returns 403 if permission missing
   - Works independently of role (role → permissions mapping maintained in memory)

4. **Role Verification Middleware**
   - Checks user's role matches required role(s)
   - Supports multiple allowed roles
   - Returns 403 if role not in allowed list

### Permission Enforcement

```typescript
// Middleware stack for a protected endpoint:

// Route: DELETE /api/organizations/:orgId/projects/:projectId
router.delete('/:projectId',
  authenticate,                    // ✓ User is authenticated
  isOrganizationMember,          // ✓ User is member of org
  checkRole(Role.OWNER, Role.ADMIN),  // ✓ User is Owner or Admin
  checkPermission(Permission.DELETE_PROJECT), // ✓ Has delete permission
  deleteProjectHandler            // Execute handler
);
```

---

## Roles

### 1. Owner

**Description**

The owner is the creator/primary administrator of an organization. There can be multiple owners in an organization. The owner has unrestricted access and can manage all aspects of the organization including billing, member management, and data deletion.

**Hierarchy Level**: Level 1 (Highest)

**Responsibilities**

- **Organization Management**
  - Create/update/delete organization
  - Manage organization settings and branding
  - View organization activity logs and analytics
  - Manage billing and subscription plan
  - Export/backup organization data

- **Member Management**
  - Invite members to organization
  - Assign/reassign roles to all members
  - Remove members from organization
  - Accept/reject join requests

- **Project Oversight**
  - Create, update, delete any project
  - Archive/restore projects
  - Manage project settings and visibility
  - Assign project managers
  - View all project activity

- **Data Governance**
  - Delete organization and all associated data
  - Manage data retention policies
  - View audit logs for compliance
  - Configure security settings

**Permissions**

- `create:organization` - Create new organization
- `update:organization` - Modify organization settings
- `delete:organization` - Delete organization permanently
- `manage:members` - Add/remove/change member roles
- `invite:members` - Send invitations to users
- `create:project` - Create new projects
- `update:project` - Modify project settings
- `delete:project` - Delete projects
- `manage:project` - Manage project members and settings
- `create:task` - Create tasks in any project
- `update:task` - Edit any task
- `delete:task` - Delete any task
- `assign:task` - Assign tasks to users
- `create:comment` - Comment on tasks
- `update:comment` - Edit own/others comments
- `delete:comment` - Delete any comment

**Features Access**

- ✅ Organization Dashboard (full analytics)
- ✅ Member Management Console
- ✅ Project Management (all projects)
- ✅ Task Management (all tasks)
- ✅ Board Views (Kanban, List, Timeline, Calendar)
- ✅ Activity Logs & Audit Trail
- ✅ Settings & Configuration
- ✅ Billing & Subscription
- ✅ Data Export
- ✅ Advanced Reporting

**Quota & Limits**

- Unlimited projects
- Unlimited team members
- Unlimited storage (based on plan)
- Highest API rate limit: 10,000 req/hour

**Example Use Case**

Jane creates a company organization on ProjectPal. She invites her team leads as Admins and other developers as Members. She can see all projects, tasks, and can revoke access anytime. When the company expands, Jane adds another owner to help manage the organization.

---

### 2. Admin

**Description**

Admins are power users delegated by owners to manage day-to-day operations. They handle project creation, member invitations, and task oversight. Admins cannot modify organization settings, manage billing, or delete the organization.

**Hierarchy Level**: Level 2

**Responsibilities**

- **Project Management**
  - Create and configure projects
  - Update project settings and details
  - Delete projects (but not organization)
  - Archive/restore projects
  - Manage project permissions

- **Team Leadership**
  - Invite members to organization
  - Assign tasks and manage assignments
  - Monitor team productivity
  - Review project progress
  - Manage sprint planning (if sprints enabled)

- **Task Oversight**
  - Create tasks in projects
  - Assign tasks to team members
  - Update task status and metadata
  - Delete tasks within their visibility scope
  - Create labels and manage task organization

- **Collaboration**
  - Comment on tasks
  - Review and approve task changes
  - Manage team boards and views
  - Create and organize boards

**Permissions**

- `update:organization` - Modify organization settings (limited)
- `invite:members` - Send invitations
- `create:project` - Create projects
- `update:project` - Modify project settings
- `delete:project` - Delete projects
- `manage:project` - Manage project configuration
- `create:task` - Create tasks
- `update:task` - Edit tasks
- `delete:task` - Delete tasks
- `assign:task` - Assign tasks to members
- `create:comment` - Add comments
- `update:comment` - Edit own/others comments
- `delete:comment` - Delete comments

**Features Access**

- ✅ Organization Dashboard (limited analytics)
- ✅ Project Management (all projects)
- ✅ Task Management (all tasks)
- ✅ Board Views (Kanban, List, Timeline)
- ✅ Team Member View
- ✅ Activity Logs (project level)
- ❌ Billing & Subscription
- ❌ Organization Settings (deletion only)
- ❌ Member Role Management (can't change roles)
- ❌ Advanced Reporting

**Quota & Limits**

- Unlimited projects
- Cannot manage members (except invite)
- Can manage up to 5 concurrent projects effectively
- API rate limit: 5,000 req/hour

**Example Use Case**

Dev team lead Alex is made an Admin. He creates projects for different features, creates tasks for his team, and assigns them. He can invite new developers but cannot remove them or change their roles. He monitors the project board daily.

---

### 3. Member

**Description**

Members are the core contributors to the organization. They can create tasks, work on assigned tasks, participate in discussions, and contribute to collaborative spaces. They cannot create projects or manage other members.

**Hierarchy Level**: Level 3

**Responsibilities**

- **Task Execution**
  - Create tasks for assigned projects
  - Update own assigned tasks
  - Change task status (move columns)
  - Add time estimates and actual hours
  - Mark tasks as complete

- **Collaboration**
  - Comment on tasks
  - Reply to comments
  - Upload attachments to tasks
  - @mention team members
  - Review other members' work

- **Participation**
  - View all projects they're member of
  - Browse and filter tasks
  - View activity logs for tasks
  - Track own work progress
  - Update own profile

- **Engagement**
  - Participate in discussions
  - React to comments
  - Subscribe to task updates

**Permissions**

- `create:project` - Create projects (limited)
- `create:task` - Create tasks
- `update:task` - Update own/assigned tasks (limited)
- `assign:task` - Assign tasks to self only
- `create:comment` - Add comments
- `update:comment` - Edit own comments only
- `delete:comment` - Delete own comments only

**Features Access**

- ✅ Organization Dashboard (own work only)
- ✅ Project View (projects they're in)
- ✅ Task Management (create & work on tasks)
- ✅ Board Views (Kanban, List, Timeline)
- ✅ My Work / Assigned Tasks
- ✅ Activity Logs (own activities)
- ✅ Profile & Settings (own)
- ❌ Project Settings
- ❌ Member Management
- ❌ Task Deletion
- ❌ Organization Settings

**Quota & Limits**

- Can create up to 10 projects per month
- Can participate in unlimited projects
- Can manage own tasks/comments only
- API rate limit: 1,000 req/hour

**Example Use Case**

Developer Sarah is a Member in Acme Inc's organization. She can see her assigned tasks, create new tasks when needed, update progress, and comment on tasks. She cannot delete tasks or manage other members. She can see Acme's public projects.

---

### 4. Guest

**Description**

Guests are external or limited-access users who can participate in discussions and view information but cannot create or modify resources. Perfect for contractors, consultants, or stakeholders who need visibility but not control.

**Hierarchy Level**: Level 4 (Lowest)

**Responsibilities**

- **Observation**
  - View projects (if permitted)
  - View tasks (if permitted)
  - Review activity and progress
  - See comments and discussions

- **Participation** (Limited)
  - Add comments to tasks
  - React to comments
  - Cannot reply to comments
  - Cannot suggest changes

- **No Creation**
  - Cannot create projects
  - Cannot create tasks
  - Cannot assign tasks
  - Cannot modify anything

**Permissions**

- `create:comment` - Add comments only

**Features Access**

- ✅ Organization Dashboard (read-only)
- ✅ Project View (read-only)
- ✅ Task View (read-only)
- ✅ Board Views (read-only, no drag-drop)
- ✅ Comments (read-only, but can comment)
- ❌ Create Tasks
- ❌ Modify Tasks
- ❌ Assign Tasks
- ❌ Delete Comments
- ❌ Project Management
- ❌ Member Management
- ❌ Organization Settings

**Quota & Limits**

- Read-only access to 3 projects maximum
- Can add comments only
- Cannot upload attachments
- API rate limit: 100 req/hour

**Example Use Case**

Client stakeholder Michael is invited as a Guest. He can view the project board, see task progress, and add comments. He cannot make changes, assign tasks, or see sensitive organization settings. Perfect for status updates and feedback.

---

## Permission Matrix

Complete permission matrix showing which roles have which permissions:

| Permission | Owner | Admin | Member | Guest |
|-----------|-------|-------|--------|-------|
| **Organization** |
| `create:organization` | ✅ | ❌ | ❌ | ❌ |
| `update:organization` | ✅ | ✅ | ❌ | ❌ |
| `delete:organization` | ✅ | ❌ | ❌ | ❌ |
| `manage:members` | ✅ | ❌ | ❌ | ❌ |
| **Invitations** |
| `invite:members` | ✅ | ✅ | ❌ | ❌ |
| **Projects** |
| `create:project` | ✅ | ✅ | ✅ | ❌ |
| `update:project` | ✅ | ✅ | ❌ | ❌ |
| `delete:project` | ✅ | ✅ | ❌ | ❌ |
| `manage:project` | ✅ | ✅ | ❌ | ❌ |
| **Tasks** |
| `create:task` | ✅ | ✅ | ✅ | ❌ |
| `update:task` | ✅ | ✅ | ✅ | ❌ |
| `delete:task` | ✅ | ✅ | ❌ | ❌ |
| `assign:task` | ✅ | ✅ | ✅ | ❌ |
| **Comments** |
| `create:comment` | ✅ | ✅ | ✅ | ✅ |
| `update:comment` | ✅ | ✅ | ✅ | ❌ |
| `delete:comment` | ✅ | ✅ | ✅ | ❌ |

---

## System Architecture & Access Control

### RBAC Implementation

The role-based access control is implemented through **middleware-based authorization**:

```typescript
// Enum definition
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

export enum Permission {
  // Organization
  CREATE_ORG = 'create:organization',
  UPDATE_ORG = 'update:organization',
  DELETE_ORG = 'delete:organization',
  MANAGE_MEMBERS = 'manage:members',
  INVITE_MEMBERS = 'invite:members',
  
  // Projects
  CREATE_PROJECT = 'create:project',
  UPDATE_PROJECT = 'update:project',
  DELETE_PROJECT = 'delete:project',
  MANAGE_PROJECT = 'manage:project',
  
  // Tasks
  CREATE_TASK = 'create:task',
  UPDATE_TASK = 'update:task',
  DELETE_TASK = 'delete:task',
  ASSIGN_TASK = 'assign:task',
  
  // Comments
  CREATE_COMMENT = 'create:comment',
  UPDATE_COMMENT = 'update:comment',
  DELETE_COMMENT = 'delete:comment'
}

// Role → Permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    // All permissions...
  ],
  [Role.ADMIN]: [
    // All except org management...
  ],
  [Role.MEMBER]: [
    // Create & update own...
  ],
  [Role.GUEST]: [
    Permission.CREATE_COMMENT
  ]
}
```

### Middleware Stack

Every protected API endpoint uses this middleware stack:

```
Request
  ↓
[1] Authentication Middleware
    - Validate JWT token
    - Extract user info
    - Return 401 if invalid
  ↓
[2] Tenant Guard Middleware
    - Verify user is org member
    - Load user's role in org
    - Return 403 if not member
  ↓
[3] Permission Check Middleware (optional)
    - Verify specific permission
    - Return 403 if missing
  ↓
[4] Role Check Middleware (optional)
    - Verify role matches required roles
    - Return 403 if mismatch
  ↓
[5] Resource Verification Middleware (optional)
    - Verify resource belongs to org
    - Check user can access resource
    - Return 403 if denied
  ↓
Route Handler
  - Execute business logic
  - User context available: req.user
  - Org context available: req.user.organizationId
```

### Tenant Isolation

Data isolation is enforced at **multiple levels**:

1. **Database Level**
   - All queries filter by `organization_id`
   - Indexes on `organization_id` for performance
   - Foreign key constraints ensure data integrity

2. **Query Level**
   ```typescript
   // Every organization-scoped query:
   const projects = await prisma.project.findMany({
     where: {
       organizationId: req.user.organizationId,  // Always filter!
       archived: false
     }
   });
   ```

3. **Middleware Level**
   - Tenant guard verifies membership
   - Organization ID extracted from URL
   - Verified against JWT + database

4. **Application Level**
   - User context attached to request
   - All operations scoped to user's org
   - No cross-org data access possible

### Data Flow Example

```
1. API Request
   POST /api/organizations/org-123/projects
   Header: Authorization: Bearer <jwt>
   Body: { name: "Project Alpha" }

2. Authentication Middleware
   ├─ Extract token from header
   ├─ Verify JWT signature
   ├─ Check token not expired
   └─ Attach user: { id: "user-456", email: "..." }

3. Tenant Guard Middleware
   ├─ Extract org ID from URL: "org-123"
   ├─ Query: SELECT * FROM organization_members
   │         WHERE organizationId = "org-123"
   │         AND userId = "user-456"
   ├─ Found member with role: "admin"
   └─ Attach to request: req.user.role = "admin"

4. Permission Check Middleware
   ├─ Load ROLE_PERMISSIONS["admin"]
   ├─ Check if contains "create:project"
   ├─ Yes → continue
   └─ No → return 403 Forbidden

5. Route Handler
   ├─ Access req.user.organizationId for context
   ├─ Create project with org-123 ownership
   └─ Return 201 Created

6. Audit Log
   ├─ Log action: "project.created"
   ├─ User: "user-456"
   ├─ Organization: "org-123"
   ├─ Changes: { name: "Project Alpha" }
   └─ Timestamp: "2026-03-13T10:30:00Z"
```

---

## Workflow Examples

### Typical Organization Lifecycle

```
Step 1: User Registration
├─ Jane signs up with email
├─ Activates email
└─ Becomes a global user

Step 2: Organization Creation
├─ Jane creates new organization
├─ Org slug: "acme-corp"
├─ Jane automatically becomes OWNER
└─ Org isolated with its own data

Step 3: Team Building
├─ Jane invites John as ADMIN
├─ Sends email with invitation link
├─ John accepts via email
├─ John gets ADMIN role in Acme

Step 4: Project Setup
├─ John (ADMIN) creates "Feature X" project
├─ Jane (OWNER) reviews structure
├─ John creates 3 boards (Todo, In Progress, Done)
└─ Team ready to work

Step 5: Task Assignment
├─ Sarah (MEMBER) invited to organization
├─ John creates task "Build API"
├─ John assigns to Sarah
├─ Sarah sees in "My Work"

Step 6: Collaboration
├─ Sarah updates task status
├─ Team comments with updates
├─ Audit log captures all changes
└─ Owner sees activity dashboard

Step 7: Stakeholder Access
├─ Client Michael needs visibility
├─ Jane invites as GUEST
├─ Michael sees board (read-only)
├─ Michael can comment
└─ Cannot modify anything
```

### Permission Escalation

Users **cannot self-escalate** and **cannot have multiple roles** in one org:

```
Initial State:
├─ Sarah: MEMBER
└─ Only has: create:task, update:task (own), create:comment

Sarah asks to become ADMIN:
├─ John (ADMIN) cannot approve
├─ Only Jane (OWNER) can change roles
└─ Jane changes Sarah → ADMIN in database

After Change:
├─ Sarah: ADMIN
├─ JWT still has old role (until refresh)
├─ Next token refresh loads new role
├─ Now has additional permissions
└─ Can manage projects
```

### Cross-Tenant Isolation

```
Scenario: Developer in 2 organizations

Jane is in:
├─ Acme Inc (OWNER)
│  ├─ Can see: all Acme projects
│  ├─ Token org_id: "acme-123"
│  └─ Permissions: all
│
└─ TechCorp (MEMBER)
   ├─ Can see: only TechCorp projects
   ├─ Must switch org context
   └─ Permissions: limited

Isolation Guarantee:
├─ When accessing acme.projectpal.com
│  └─ Only sees Acme data
│
├─ When accessing techcorp.projectpal.com
│  └─ Only sees TechCorp data
│
└─ API calls to /api/organizations/techcorp-456
   ├─ Validates TechCorp membership
   ├─ Loads TechCorp role
   ├─ Returns 403 if not member
   └─ Never sees Acme data
```

---

## Security Considerations

### Authorization vs Authentication

| Aspect | Authentication | Authorization |
|--------|---|---|
| **Purpose** | Verify WHO you are | Verify what you CAN DO |
| **Method** | JWT tokens, passwords | RBAC, permissions |
| **Failure Response** | 401 Unauthorized | 403 Forbidden |
| **In ProjectPal** | Email + password → JWT | Role → Permissions → Access |

### Permission Hierarchy

Permissions are **flat** not hierarchical:

```
❌ Not like this (hierarchy):
├─ ADMIN has all MEMBER permissions
│  └─ MEMBER permissions are subset

✅ Like this (flat):
├─ OWNER: [all permissions]
├─ ADMIN: [admin-specific perms]
├─ MEMBER: [member-specific perms]
└─ GUEST: [guest-specific perms]

// Each role has explicit permission list
// No permission inheritance
// Easier to audit and predict
```

### Privilege Escalation Prevention

1. **Cannot change own role** - Requires OWNER request
2. **Cannot grant permissions** - Only OWNER can assign roles
3. **Cannot bypass middleware** - Applies to all endpoints
4. **Cannot cross-tenant** - Verified at 2+ layers
5. **Cannot use stale tokens** - Token refresh loads current role

---

## Integration Points

### API Endpoints by Role

**For OWNERS only:**
- `DELETE /api/organizations/:orgId` - Delete entire organization
- `PUT /api/organizations/:orgId/members/:memberId/role` - Change member role
- `GET /api/organizations/:orgId/billing` - View billing info
- `POST /api/organizations/:orgId/members/:memberId/remove` - Remove member

**For OWNERS/ADMINS:**
- `POST /api/organizations/:orgId/projects` - Create project
- `PUT /api/organizations/:orgId/projects/:projectId` - Update project
- `DELETE /api/organizations/:orgId/projects/:projectId` - Delete project
- `POST /api/organizations/:orgId/members/invite` - Invite member

**For MEMBERS+:**
- `POST /api/organizations/:orgId/projects/:projectId/tasks` - Create task
- `PUT /api/organizations/:orgId/projects/:projectId/tasks/:taskId` - Update task
- `POST /api/organizations/:orgId/projects/:projectId/tasks/:taskId/comments` - Comment

**For GUESTS+:**
- `GET /api/organizations/:orgId/projects` - View projects (read-only)
- `GET /api/organizations/:orgId/projects/:projectId/tasks` - View tasks (read-only)
- `POST /api/organizations/:orgId/projects/:projectId/tasks/:taskId/comments` - Comment

---

## Best Practices

### For Developers Implementing Access Control

1. **Always Include Organization ID**
   ```typescript
   // ✅ Good
   const projects = await prisma.project.findMany({
     where: { 
       organizationId: req.user.organizationId,
       archived: false 
     }
   });
   
   // ❌ Bad - no organization filter!
   const projects = await prisma.project.findMany();
   ```

2. **Use Middleware, Don't Check in Handler**
   ```typescript
   // ✅ Good - check in middleware
   router.post('/create', 
     authenticate, 
     checkPermission(Permission.CREATE_PROJECT),
     handleCreate
   );
   
   // ❌ Bad - checking in handler (can be bypassed)
   router.post('/create', async (req, res) => {
     if (req.user.permissions?.includes(...)) {
       // handle
     }
   });
   ```

3. **Log All Access Denials**
   ```typescript
   // Good practice
   if (!hasPermission) {
     logger.warn('Access denied', {
       userId: req.user.id,
       orgId: req.user.organizationId,
       permission: requiredPermission,
       endpoint: req.path
     });
     return res.status(403).json({ error: 'Forbidden' });
   }
   ```

4. **Test Permission Boundaries**
   - Test each role independently
   - Test permission combinations
   - Test cross-tenant access (should fail)
   - Test token expiration
   - Test permission cache invalidation

### For Product Managers / Stakeholders

1. **Clear Role Definitions**
   - Each role has clear responsibility
   - No overlap in critical permissions
   - Role ladder is clear (Owner > Admin > Member > Guest)

2. **Audit Trail**
   - All actions logged with user
   - Timestamps on all changes
   - Can review who did what when

3. **Invitation System**
   - No passwords shared
   - Email verification required
   - Invitations expire in 7 days
   - Can resend or cancel

4. **Role Constraints**
   - Users can have different roles in different orgs
   - Cannot hold multiple roles in same org
   - Owner cannot be removed unless another owner exists

---

## Summary

ProjectPal implements a **production-grade RBAC system** with:

✅ **4 distinct roles** with clear responsibilities  
✅ **16 granular permissions** across organization/project/task domains  
✅ **Multi-layer access control** (auth → tenant → permission → role)  
✅ **Complete tenant isolation** preventing cross-org data leakage  
✅ **Audit trail** capturing all actions  
✅ **Secure invitation system** for onboarding  
✅ **Flexible permission matrix** supporting diverse use cases  

This architecture allows:
- **Founders** to maintain organization control
- **Team leads** to manage projects effectively
- **Contributors** to focus on their work
- **Stakeholders** to maintain visibility
- **Security** to be verifiable and auditable
