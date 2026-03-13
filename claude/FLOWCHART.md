User Registration
       ↓
User calls: POST /api/organizations
       ↓
Organization created with:
  - organization.id
  - organization.name
  - organization.slug
       ↓
OrganizationMember created with:
  - organizationId: org.id
  - userId: user.id
  - role: 'owner'
       ↓
Creator now has full access to organization


======================================================


Admin/Owner calls: POST /api/organizations/:id/invitations
  ├─ Validates user is admin/owner
  ├─ Creates Invitation record with token
  ├─ Sends email: https://app.com/invitations/{token}
  └─ Returns 201

User receives email
       ↓
User clicks invitation link
       ↓
Frontend: GET /api/invitations/{token} (get details)
       ↓
User clicks "Accept"
       ↓
Frontend: POST /api/invitations/{token}/accept
       ↓
Backend acceptInvitation():
  ├─ Validates token not expired
  ├─ Creates OrganizationMember:
  │  ├─ organizationId
  │  ├─ userId
  │  └─ role: (from invitation)
  ├─ Deletes Invitation
  └─ Logs activity
       ↓
User now has access with assigned role

=========================================================================

Admin/Owner calls: POST /api/organizations/:id/invitations
  ├─ Validates user is admin/owner
  ├─ Creates Invitation record with token
  ├─ Sends email: https://app.com/invitations/{token}
  └─ Returns 201

User receives email
       ↓
User clicks invitation link
       ↓
Frontend: GET /api/invitations/{token} (get details)
       ↓
User clicks "Accept"
       ↓
Frontend: POST /api/invitations/{token}/accept
       ↓
Backend acceptInvitation():
  ├─ Validates token not expired
  ├─ Creates OrganizationMember:
  │  ├─ organizationId
  │  ├─ userId
  │  └─ role: (from invitation)
  ├─ Deletes Invitation
  └─ Logs activity
       ↓
User now has access with assigned role

=========================================================================

┌─────────────────────────────────────────────────────────┐
│           ORGANIZATION ACCESS CREATION                  │
└─────────────────────────────────────────────────────────┘

SCENARIO 1: Creator Creates Organization
═══════════════════════════════════════════

1. POST /api/organizations
   ├─ Body: { name: "Acme Inc", slug: "acme" }
   ├─ Auth: Bearer {jwt} (user-123)
   └─ Authenticate ✓

2. OrganizationService.createOrganization(user-123, {...})
   ├─ INSERT INTO organizations VALUES(...)
   ├─ INSERT INTO organization_members VALUES(
   │    organizationId: 'org-456',
   │    userId: 'user-123',
   │    role: 'owner'
   │  )
   └─ Return organization

3. Response
   ├─ 201 Created
   ├─ data: organization
   └─ User is now OWNER


SCENARIO 2: Admin Invites New Member
════════════════════════════════════

1. POST /api/organizations/org-456/invitations
   ├─ Body: { email: "john@example.com", role: "member" }
   ├─ Auth: Bearer {jwt} (admin-456)
   └─ Authenticate ✓

2. Check membership
   ├─ SELECT FROM organization_members
   │  WHERE organizationId='org-456' AND userId='admin-456'
   ├─ Found: role='admin'
   └─ Check permission: admin has 'invite:members' ✓

3. InvitationService.createInvitation(...)
   ├─ Generate token: abc123def456...
   ├─ INSERT INTO invitations VALUES(
   │    organizationId: 'org-456',
   │    email: 'john@example.com',
   │    role: 'member',
   │    token: 'abc123...',
   │    expiresAt: now + 7 days
   │  )
   ├─ Send email with link:
   │  https://app.com/invitations/abc123...
   └─ Return invitation

4. Response: 201 Created


SCENARIO 3: Invitee Accepts Invitation
═══════════════════════════════════════

1. User receives email
   ├─ Clicks link: /invitations/abc123...
   └─ Frontend loads: GET /api/invitations/abc123...

2. GET /api/invitations/{token}
   ├─ SELECT FROM invitations WHERE token='abc123...'
   ├─ Check: expiresAt > now() ✓
   └─ Return: organization name, role, email

3. User clicks "Accept"
   ├─ POST /api/invitations/abc123.../accept
   ├─ Auth: Bearer {jwt} (john-789)
   └─ Authenticate ✓

4. InvitationService.acceptInvitation(token, john-789)
   ├─ SELECT FROM invitations WHERE token='abc123...'
   ├─ Validate: not expired ✓
   ├─ INSERT INTO organization_members VALUES(
   │    organizationId: 'org-456',
   │    userId: 'john-789',
   │    role: 'member'
   │  )
   ├─ DELETE FROM invitations WHERE token='abc123...'
   ├─ INSERT INTO activity_logs:
   │  action: 'member_joined'
   │  user: john-789
   │  org: org-456
   └─ Return success

5. Response: 200 OK
   ├─ John (john-789) is now MEMBER of org-456
   └─ John can access organization with member permissions


SCENARIO 4: Access Verification on API Call
═════════════════════════════════════════════

User: john-789 calls GET /api/organizations/org-456/projects

1. Request arrives
   ├─ Header: Authorization: Bearer {jwt}
   ├─ Param: org-456
   └─ Route: authenticate middleware

2. Authenticate Middleware
   ├─ Decode JWT
   ├─ Extract: user.id = john-789
   ├─ Verify signature ✓
   └─ Attach: req.user = { id: john-789, ... }

3. OrganizationService.checkUserOrganizationAccess(john-789, org-456)
   ├─ SELECT FROM organization_members
   │  WHERE userId='john-789'
   │  AND organizationId='org-456'
   ├─ Row found: role='member' ✓
   └─ Return member record

4. Get organization projects
   ├─ SELECT FROM projects
   │  WHERE organizationId='org-456'
   │  AND archived=false
   └─ Return projects list

5. Response: 200 OK
   ├─ data: [projects...]
   └─ User has access ✓


SCENARIO 5: Access Denied (not a member)
═════════════════════════════════════════

User: sarah-999 calls GET /api/organizations/org-456/projects

1. Authenticate ✓ (sarah-999 is valid user)

2. checkUserOrganizationAccess(sarah-999, org-456)
   ├─ SELECT FROM organization_members
   │  WHERE userId='sarah-999'
   │  AND organizationId='org-456'
   ├─ No rows found ✗
   └─ Return null

3. Access check fails
   ├─ if (!access) { return 403 }
   └─ Return error

4. Response: 403 Forbidden
   ├─ error: "Access denied"
   └─ Sarah cannot see organization data



