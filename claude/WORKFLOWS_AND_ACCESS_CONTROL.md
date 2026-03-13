# ProjectPal - Workflows & Access Control Architecture

Detailed workflow diagrams, access control flow, and architectural patterns.

---

## Access Control Decision Tree

This flowchart shows how every API request is authorized:

```
┌─────────────────────────────────────────────────────────────────┐
│                     API REQUEST RECEIVED                         │
│         POST /api/organizations/:orgId/projects                  │
│         Headers: { Authorization: Bearer <token> }               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │  Step 1: AUTHENTICATION CHECK  │
            │  Is the token valid? (JWT)     │
            └────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
            Token Invalid?      Token Valid?
    (Signature, Expiration)      (Decoded)
                    │                 │
                    ▼                 ▼
            ┌──────────────┐  ┌──────────────────────┐
            │ 401 Error    │  │ Extract User Info:   │
            │ Unauthorized │  │ - userId             │
            └──────────────┘  │ - email              │
                              │ - organizationId     │
                              │ - (old role)         │
                              └──────────┬───────────┘
                                         │
                                         ▼
            ┌────────────────────────────────┐
            │  Step 2: TENANT MEMBERSHIP     │
            │  Is user member of org?        │
            └────────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
          Not a Member?         Is a Member?
              (No DB                (Found in
              record)         OrganizationMembers)
                  │                     │
                  ▼                     ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ 403 Forbidden    │  │ Load User Role:  │
        │ Access Denied    │  │ - OWNER          │
        │                  │  │ - ADMIN          │
        │ (User not in org)│  │ - MEMBER         │
        └──────────────────┘  │ - GUEST          │
                              └────────┬─────────┘
                                       │
                                       ▼
            ┌────────────────────────────────┐
            │  Step 3: PERMISSION CHECK      │
            │  Does role have permission?    │
            │  e.g., create:project          │
            └────────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
          Permission Missing?   Permission Exists?
           (ROLE_PERMISSIONS)    (Role has it)
                  │                     │
                  ▼                     ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ 403 Forbidden    │  │ Request Allowed! │
        │ Insufficient     │  │                  │
        │ Permissions      │  │ Pass to Handler: │
        └──────────────────┘  │ - req.user.id    │
                              │ - req.user.org   │
                              │ - req.user.role  │
                              │ - req.user.perms │
                              └────────┬─────────┘
                                       │
                                       ▼
                        ┌──────────────────────┐
                        │ 4. RESOURCE HANDLER  │
                        │                      │
                        │ Business logic with  │
                        │ guaranteed:          │
                        │ - User in org        │
                        │ - User has perm      │
                        │ - User context OK    │
                        │                      │
                        │ (Safe to create,     │
                        │  access, modify)     │
                        │                      │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ 5. LOG ACTION        │
                        │                      │
                        │ Create ActivityLog:  │
                        │ - userId             │
                        │ - action: created    │
                        │ - entityType: task   │
                        │ - timestamp          │
                        │ - changes: {...}     │
                        │                      │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │ RESPONSE SENT        │
                        │ 200/201 Success      │
                        └──────────────────────┘
```

---

## Role Assignment & Escalation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│              USER JOINS ORGANIZATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Scenario: John joins Acme Inc

Step 1: Invitation Sent
┌──────────────────────────────────────┐
│ Admin Jane:                          │
│ POST /api/members/invite             │
│ {                                    │
│   email: "john@example.com",         │
│   role: "admin"                      │
│ }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ System:                              │
│ ✓ Verify Jane is OWNER or ADMIN      │
│ ✓ Check John not already member      │
│ ✓ Generate invitation token          │
│ ✓ Create Invitation record           │
│ ✓ Send email with link               │
│                                      │
│ Email: "Accept invite to Acme Inc"  │
│ Link: .../?invitation_token=abc123   │
└──────────────┬───────────────────────┘
               │
         [7 days validity]
               │
               ▼
Step 2: John Clicks Link
┌──────────────────────────────────────┐
│ John visits link with token          │
│ Frontend shows: Accept invite?       │
│ John clicks: ACCEPT                  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ System:                              │
│ ✓ Verify token valid & not expired   │
│ ✓ Verify john@example.com matches    │
│ ✓ Find or create user account        │
│ ✓ Create OrganizationMember:         │
│   {                                  │
│     organizationId: "acme-456",      │
│     userId: "john-789",              │
│     role: "admin"                    │
│   }                                  │
│ ✓ Mark invitation as acceptedAt      │
└──────────────┬───────────────────────┘
               │
               ▼
Step 3: John Logged In
┌──────────────────────────────────────┐
│ John logs in with email + password   │
│ JWT Token generated:                 │
│ {                                    │
│   sub: "john-789",                   │
│   email: "john@example.com",         │
│   org_id: "acme-456",                │
│   role: "admin",                     │
│   permissions: [                     │
│     "update:organization",           │
│     "invite:members",                │
│     "create:project",                │
│     "delete:project",                │
│     "create:task",                   │
│     ...                              │
│   ]                                  │
│ }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ John makes API request:              │
│ Middleware flow:                     │
│ 1. Verify token → Valid              │
│ 2. Check org membership → Member     │
│ 3. Load role → ADMIN                 │
│ 4. Check permission → Has it         │
│ 5. Execute handler ✓                 │
└──────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              ROLE CHANGE WORKFLOW                                │
└─────────────────────────────────────────────────────────────────┘

Scenario: Jane (OWNER) promotes Sarah from MEMBER to ADMIN

Step 1: Request
┌──────────────────────────────────────┐
│ Jane (OWNER) Makes Request:          │
│ PUT /organizations/acme/members/     │
│        sarah-123/role                │
│ {                                    │
│   role: "admin"                      │
│ }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
Step 2: Authorization
┌──────────────────────────────────────┐
│ Middleware checks:                   │
│ 1. Jane authenticated? ✓             │
│ 2. Jane in Acme? ✓                   │
│ 3. Jane has manage:members? ✓        │
│    (Only OWNER has this)             │
│ 4. Sarah in Acme? ✓                  │
└──────────────┬───────────────────────┘
               │
               ▼
Step 3: Update Database
┌──────────────────────────────────────┐
│ UPDATE organization_members          │
│ SET role = 'admin'                   │
│ WHERE                                │
│   organizationId = 'acme-456' AND    │
│   userId = 'sarah-123'               │
└──────────────┬───────────────────────┘
               │
               ▼
Step 4: Log Change
┌──────────────────────────────────────┐
│ INSERT activity_logs:                │
│ {                                    │
│   entityType: 'organization_member', │
│   entityId: 'member-record-456',     │
│   action: 'updated',                 │
│   userId: 'jane-789',                │
│   organizationId: 'acme-456',        │
│   changes: {                         │
│     role: {                          │
│       from: 'member',                │
│       to: 'admin'                    │
│     }                                │
│   },                                 │
│   timestamp: '2026-03-13T10:30:00Z'  │
│ }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
Step 5: Immediate Effect
┌──────────────────────────────────────┐
│ Sarah's next token refresh:          │
│ ✓ New role loaded from DB: ADMIN     │
│ ✓ New permissions loaded             │
│ ✓ Can now create/delete projects     │
│                                      │
│ Note: If Sarah is logged in now,     │
│ her current token still has OLD      │
│ permissions until refresh            │
└──────────────────────────────────────┘
```

---

## Multi-Tenant Data Isolation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│         HOW DATA ISOLATION PREVENTS CROSS-TENANT ACCESS          │
└─────────────────────────────────────────────────────────────────┘

Scenario: Sarah works at BOTH Acme Inc. AND TechCorp

Database State:
┌────────────────────────────────────────────────────────────────┐
│ Organizations:                                                 │
│ - acme-456: { name: "Acme Inc" }                              │
│ - tech-789: { name: "TechCorp" }                              │
│                                                                │
│ Users:                                                         │
│ - sarah-123: { email: "sarah@company.com" }                  │
│                                                                │
│ OrganizationMembers:                                          │
│ - Record 1: acme-456 + sarah-123 + role: ADMIN              │
│ - Record 2: tech-789 + sarah-123 + role: MEMBER             │
└────────────────────────────────────────────────────────────────┘

Application State (Must be One Or The Other):

┌──────────────────────────────────┐
│ Sarah logged into Acme dashboard │
│ Token contains: org_id = acme-456│
│ Authorization header sent with   │
│ all requests to /acme/* routes   │
└──────────────────────────────────┘
              │
              ▼
     Accessing Acme resources:
     
     GET /api/organizations/acme-456/projects
     
     1. Middleware extracts from URL: org_id = acme-456
     2. Middleware checks JWT: org_id = acme-456
     3. Match! ✓ Continue
     4. Verify member: SELECT * FROM organization_members
                       WHERE organizationId = acme-456
                       AND userId = sarah-123
     5. Found! Role = ADMIN
     6. Load permissions for ADMIN
     7. Handler executes:
        SELECT * FROM projects
        WHERE organizationId = acme-456  ← CRITICAL!
     8. Returns only Acme projects

Attempting to access TechCorp (DENIED):

     GET /api/organizations/tech-789/projects
     
     1. URL param: org_id = tech-789
     2. JWT claim: org_id = acme-456
     3. MISMATCH! 🚫
     4. OR: Verify member in tech-789
             (But token says acme-456)
     5. Return 403 Forbidden

Alternative Scenario: Jane accesses with Acme token trying to see TechCorp data:

     GET /api/organizations/tech-789/projects
     
     Middleware checks:
     ├─ Verify user in tech-789? 
     │  Query: SELECT * FROM organization_members
     │         WHERE organizationId = tech-789
     │         AND userId = jane-456
     │  Result: NOT FOUND (Jane only in Acme)
     └─ Return 403 Forbidden ✗

Attack Prevention:

Attempt 1: Forge JWT to have tech-789
  ├─ Cannot do → JWT is signed with secret
  └─ Forged token fails verification

Attempt 2: Use another user's token
  ├─ Cannot do → Token includes user identity
  └─ Security audit logs attempt

Attempt 3: Query bypass (SQL injection)
  ├─ Cannot do → Prisma uses parameterized queries
  └─ Injection attempts neutralized

Attempt 4: Direct database access
  ├─ Cannot do → Only backend can access DB
  └─ Frontend has no connection
```

---

## Project Creation Workflow with Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│              PROJECT CREATION FLOW BY ROLE                       │
└─────────────────────────────────────────────────────────────────┘

Scenario: Different users create projects in Acme Inc

USER: Sarah (MEMBER) Creates Project
═══════════════════════════════════════

Request:
POST /api/organizations/acme-456/projects
Headers: Auth-Token: <sarah-token>
Body: { name: "New Feature", key: "FEAT" }

Middleware Stack:
├─ [1] Authenticate
│      └─ JWT valid? YES → User: sarah-123
│
├─ [2] Tenant Guard  
│      └─ sarah in acme-456? YES → Role: MEMBER
│
├─ [3] Permission Check
│      └─ MEMBER has create:project? 
│         YES (MEMBER can create projects)
│
└─ [4] Handler Executes
       ├─ Create project with org_id = acme-456
       ├─ Set created_by = sarah-123
       ├─ Log action
       └─ Return 201 Created

Result: ✓ SUCCESS


USER: John (GUEST) Creates Project
═════════════════════════════════════

Request:
POST /api/organizations/acme-456/projects
Headers: Auth-Token: <john-token>
Body: { name: "New Feature", key: "FEAT" }

Middleware Stack:
├─ [1] Authenticate
│      └─ JWT valid? YES → User: john-456
│
├─ [2] Tenant Guard
│      └─ john in acme-456? YES → Role: GUEST
│
├─ [3] Permission Check
│      └─ GUEST has create:project?
│         NO ✗ (Only OWNER, ADMIN, MEMBER)
│
└─ [4] Permission Denied
       └─ Return 403 Forbidden

Response:
{
  "error": "Insufficient permissions",
  "required": "create:project",
  "userRole": "guest",
  "userPermissions": ["create:comment"]
}

Result: ✗ DENIED


USER: Unknown User (Not in Acme) Tries Access
═════════════════════════════════════════════════

Request:
POST /api/organizations/acme-456/projects
Headers: Auth-Token: <unknown-token>
Body: { name: "New Feature", key: "FEAT" }

Middleware Stack:
├─ [1] Authenticate
│      └─ JWT valid? NO ✗ 
│         (Unknown token, invalid signature, etc.)
│
└─ [2] Return 401 Unauthorized
       └─ "Invalid or missing token"

Result: ✗ DENIED


Successful Flow - Task Creation Audit Trail:

1. Request received at api-server
2. JWT decoded: sarah-123, acme-456, admin
3. Tenant verified: SELECT from org_members ✓
4. Permission verified: admin ∋ create:task ✓
5. Handler creates task:
   INSERT tasks(
     project_id, 
     title, 
     created_by, 
     created_at
   ) VALUES (
     'proj-789',
     'Implement auth',
     'sarah-123',
     NOW()
   )
6. Audit logged:
   INSERT activity_logs(
     organization_id,
     entity_type,
     entity_id,
     user_id,
     action,
     timestamp
   ) VALUES (
     'acme-456',
     'task',
     'task-999',
     'sarah-123',
     'created',
     NOW()
   )
7. Response sent: 201 Created
```

---

## Feature Access by Role

```
┌─────────────────────────────────────────────────────────────────┐
│           FEATURE MATRIX - WHAT EACH ROLE CAN DO                │
└─────────────────────────────────────────────────────────────────┘

ORGANIZATION LEVEL FEATURES
╔═════════════════════════════════════════════════════════════════╗
║ Feature                  │ Owner │ Admin │ Member │ Guest │     ║
╠═════════════════════════════════════════════════════════════════╣
║ View Org Dashboard       │   ✓   │   ✓   │   ✓    │   ◌   │     ║
║ View Members List        │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Invite Members           │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Change Member Role       │   ✓   │   ✗   │   ✗    │   ✗   │     ║
║ Remove Members           │   ✓   │   ✗   │   ✗    │   ✗   │     ║
║ Update Org Settings      │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Delete Organization      │   ✓   │   ✗   │   ✗    │   ✗   │     ║
║ View Billing             │   ✓   │   ✗   │   ✗    │   ✗   │     ║
║ Update Subscription      │   ✓   │   ✗   │   ✗    │   ✗   │     ║
║ Export Organization Data │   ✓   │   ✗   │   ✗    │   ✗   │     ║
║ View Audit Logs          │   ✓   │   ✓   │   ◌    │   ✗   │     ║
╚═════════════════════════════════════════════════════════════════╝

PROJECT LEVEL FEATURES
╔═════════════════════════════════════════════════════════════════╗
║ Feature                  │ Owner │ Admin │ Member │ Guest │     ║
╠═════════════════════════════════════════════════════════════════╣
║ View Projects            │   ✓   │   ✓   │   ✓    │   ✓   │     ║
║ Create Projects          │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Edit Project Settings    │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Delete Project           │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Archive Project          │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Add Project Members      │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Invite to Project        │   ✓   │   ✓   │   ◌    │   ✗   │     ║
║ Create Boards            │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Edit Board               │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Delete Board             │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Create Labels            │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Delete Labels            │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ View Project Activity    │   ✓   │   ✓   │   ✓    │   ◌   │     ║
╚═════════════════════════════════════════════════════════════════╝

TASK LEVEL FEATURES
╔═════════════════════════════════════════════════════════════════╗
║ Feature                  │ Owner │ Admin │ Member │ Guest │     ║
╠═════════════════════════════════════════════════════════════════╣
║ View Tasks               │   ✓   │   ✓   │   ✓    │   ✓   │     ║
║ Create Tasks             │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Edit Task Title/Desc     │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Delete Task              │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Change Task Status       │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Assign Task (to others)  │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Add Subtasks             │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Set Due Date             │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Add Time Estimate        │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Log Time Spent           │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Upload Attachment        │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Delete Attachment        │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ View Task Activity       │   ✓   │   ✓   │   ✓    │   ✓   │     ║
╚═════════════════════════════════════════════════════════════════╝

COMMENT LEVEL FEATURES
╔═════════════════════════════════════════════════════════════════╗
║ Feature                  │ Owner │ Admin │ Member │ Guest │     ║
╠═════════════════════════════════════════════════════════════════╣
║ View Comments            │   ✓   │   ✓   │   ✓    │   ✓   │     ║
║ Add Comment              │   ✓   │   ✓   │   ✓    │   ✓   │     ║
║ Reply to Comment         │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Edit Own Comment         │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Delete Own Comment       │   ✓   │   ✓   │   ✓    │   ✗   │     ║
║ Delete Others' Comments  │   ✓   │   ✓   │   ✗    │   ✗   │     ║
║ Pin Comment              │   ✓   │   ✓   │   ✗    │   ✗   │     ║
╚═════════════════════════════════════════════════════════════════╝

Legend:
  ✓ = Full access
  ◌ = Limited access (view own only)
  ✗ = No access
```

---

## Token & Session Management

```
┌─────────────────────────────────────────────────────────────────┐
│          JWT TOKEN LIFECYCLE & REFRESH FLOW                     │
└─────────────────────────────────────────────────────────────────┘

Initial Login:
┌────────────────────────────────┐
│ User submits:                  │
│ Email: sarah@company.com       │
│ Password: ••••••••             │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Backend:                               │
│ 1. Find user by email                  │
│ 2. Verify password (bcrypt)            │
│ 3. Load user's organization members    │
│ 4. Generate JWT access token:          │
│                                        │
│ Token payload:                         │
│ {                                      │
│   "sub": "sarah-123",                  │
│   "email": "sarah@company.com",        │
│   "org_id": "acme-456",                │
│   "role": "admin",                     │
│   "iat": 1678708200,                   │
│   "exp": 1678711800  [1 hour later]    │
│ }                                      │
│                                        │
│ 5. Generate refresh token (7 days)     │
│ 6. Store in Redis:                     │
│    SET refresh:{sarah-123} <token>     │
│    EXPIRE 604800  [7 days]             │
│                                        │
│ 7. Return to client:                   │
│ {                                      │
│   "accessToken": "eyJhb...",           │
│   "refreshToken": "xyz...",            │
│   "expiresIn": 3600                    │
│ }                                      │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Client:                                │
│ - Store accessToken in memory          │
│ - Store refreshToken in                │
│   httpOnly cookie (secure)             │
│ - Use accessToken for API calls        │
│                                        │
│ Request example:                       │
│ GET /api/tasks                         │
│ Headers: {                             │
│   Authorization: Bearer eyJhb...       │
│ }                                      │
└───────────┬────────────────────────────┘
            │
    [55 minutes later]
            │
            ▼
┌────────────────────────────────────────┐
│ Token nearing expiration                │
│ Client detects: exp - now < 5 min      │
│                                        │
│ POST /api/auth/refresh                 │
│ Headers: {                             │
│   Authorization: Bearer <old-token>    │
│ }                                      │
│ Cookies: refreshToken=xyz...           │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Backend refresh endpoint:               │
│ 1. Verify old accessToken valid        │
│ 2. Extract user_id from token          │
│ 3. Verify refreshToken in Redis        │
│    GET refresh:{sarah-123}             │
│    Match? YES ✓                        │
│ 4. Load FRESH user data from DB:       │
│    - Check current org membership      │
│    - Load current role                 │
│    - Generate new permissions list     │
│ 5. Create NEW accessToken with:        │
│    - Current role (may have changed)   │
│    - Current permissions               │
│    - New exp: now + 1 hour             │
│ 6. Return new token                    │
│                                        │
│ This ensures:                          │
│ - Permission changes take effect       │
│ - Role changes reflected               │
│ - Revoked access enforced              │
│ - Session validated with latest data   │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Client stores new token                │
│ - Old token discarded                  │
│ - New token used for next calls        │
│ - Refresh cycle continues...           │
└────────────────────────────────────────┘

Logout Flow:
┌────────────────────────────────┐
│ User clicks: Logout            │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Client sends:                          │
│ POST /api/auth/logout                  │
│ Headers: {                             │
│   Authorization: Bearer <token>        │
│ }                                      │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Backend:                               │
│ 1. Extract user_id from token          │
│ 2. Delete refresh token from Redis:    │
│    DEL refresh:{sarah-123}             │
│ 3. Optionally blacklist accessToken    │
│ 4. Return 200 OK                       │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Client:                                │
│ - Delete accessToken from memory       │
│ - Delete refreshToken from cookie      │
│ - Redirect to login page               │
│ - All API calls now return 401         │
└────────────────────────────────────────┘
```

---

## Summary of Access Tiers

```
[1] OWNER
    └─ Complete system control
       ├─ Org management (billing, deletion)
       ├─ Member management (roles, removal)
       ├─ Project oversight
       └─ All features enabled

[2] ADMIN
    └─ Day-to-day operations
       ├─ Project & team management
       ├─ Member invitations
       ├─ Task assignment
       └─ Cannot manage org or billing

[3] MEMBER
    └─ Active contributor
       ├─ Task creation & execution
       ├─ Collaboration (comments)
       ├─ Board participation
       └─ Cannot manage projects

[4] GUEST
    └─ Limited observer
       ├─ View-only access
       ├─ Commenting allowed
       └─ No creation/modification

Quick Test:
  Can create project? → OWNER, ADMIN, MEMBER
  Can delete org? → OWNER only
  Can assign task? → OWNER, ADMIN, MEMBER
  Can comment? → All roles
  Can change member roles? → OWNER only
```

