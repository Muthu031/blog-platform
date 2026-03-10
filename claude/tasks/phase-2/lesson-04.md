# Lesson 4: Permission Testing

## 🎯 Goal
Implement comprehensive tests for RBAC and multi-tenancy security.

## 📚 What You'll Learn
- Write unit tests for permissions
- Create integration tests for access control
- Test role-based endpoints
- Validate tenant isolation

## 📋 Prerequisites
- Completed Phase 2 Lessons 1-3
- Jest or testing framework installed
- All RBAC and security middleware working

## 🛠️ Tasks

### 1. Setup Testing Framework

Install dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

Create `backend/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ]
};
```

### 2. Create Permission Tests

Create `backend/src/shared/middleware/__tests__/rbac.test.ts`:

```typescript
import { checkPermission, checkRole, isOrganizationMember } from '../rbac';
import { Permission, Role } from '../../types/roles';

describe('RBAC Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-id',
        email: 'test@example.com',
        permissions: [Permission.CREATE_PROJECT]
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('checkPermission', () => {
    it('should allow request when user has permission', async () => {
      const middleware = checkPermission(Permission.CREATE_PROJECT);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny request when user lacks permission', async () => {
      const middleware = checkPermission(Permission.DELETE_ORG);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkRole', () => {
    it('should allow request when user has required role', async () => {
      mockRequest.user.role = Role.ADMIN;
      const middleware = checkRole(Role.ADMIN, Role.OWNER);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny request when user lacks required role', async () => {
      mockRequest.user.role = Role.MEMBER;
      const middleware = checkRole(Role.ADMIN, Role.OWNER);
      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
```

### 3. Create Integration Tests for Access Control

Create `backend/src/modules/organizations/__tests__/organization.integration.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Organization Access Control', () => {
  let orgId: string;
  let userId: string;
  let adminToken: string;
  let memberToken: string;
  let outsiderToken: string;

  beforeAll(async () => {
    // Create test users
    const user = await prisma.user.create({
      data: { email: 'admin@test.com', name: 'Admin' }
    });
    userId = user.id;

    const member = await prisma.user.create({
      data: { email: 'member@test.com', name: 'Member' }
    });

    const outsider = await prisma.user.create({
      data: { email: 'outsider@test.com', name: 'Outsider' }
    });

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
        members: {
          create: [
            { userId, role: 'owner' },
            { userId: member.id, role: 'member' }
          ]
        }
      }
    });
    orgId = org.id;

    // Generate tokens (mock)
    adminToken = 'valid-admin-token';
    memberToken = 'valid-member-token';
    outsiderToken = 'valid-outsider-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/organizations/:id', () => {
    it('should allow organization members to view organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(orgId);
    });

    it('should deny non-members access to organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/organizations/:id', () => {
    it('should allow owner to update organization', async () => {
      const response = await request(app)
        .put(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Org' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Org');
    });

    it('should deny member from updating organization', async () => {
      const response = await request(app)
        .put(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Not Allowed' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/organizations/:id', () => {
    it('should deny non-owners from deleting organization', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });
  });
});
```

### 4. Create Tenant Isolation Tests

Create `backend/src/shared/middleware/__tests__/tenantIsolation.test.ts`:

```typescript
import { tenantGuard, verifyResourceTenant } from '../tenantIsolation';

describe('Tenant Isolation', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-id',
        email: 'test@example.com'
      },
      params: {
        orgId: 'org-id'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('tenantGuard', () => {
    it('should deny access if user is not organization member', async () => {
      // Mock prisma to return no member
      prisma.organizationMember.findUnique = jest.fn().mockResolvedValue(null);

      await tenantGuard(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access if user is organization member', async () => {
      prisma.organizationMember.findUnique = jest.fn().mockResolvedValue({
        role: 'member'
      });

      await tenantGuard(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user.organizationId).toBe('org-id');
    });
  });
});
```

### 5. Create Role Permission Tests

Create `backend/src/shared/types/__tests__/roles.test.ts`:

```typescript
import { Role, Permission, ROLE_PERMISSIONS } from '../roles';

describe('Role Permissions', () => {
  describe('OWNER role', () => {
    it('should have all permissions', () => {
      const permissions = ROLE_PERMISSIONS[Role.OWNER];
      
      expect(permissions).toContain(Permission.CREATE_ORG);
      expect(permissions).toContain(Permission.DELETE_ORG);
      expect(permissions).toContain(Permission.MANAGE_MEMBERS);
      expect(permissions).toContain(Permission.INVITE_MEMBERS);
      expect(permissions).toContain(Permission.CREATE_PROJECT);
      expect(permissions).toContain(Permission.DELETE_PROJECT);
      expect(permissions).toContain(Permission.DELETE_TASK);
      expect(permissions).toContain(Permission.DELETE_COMMENT);
    });
  });

  describe('ADMIN role', () => {
    it('should not have org deletion permission', () => {
      const permissions = ROLE_PERMISSIONS[Role.ADMIN];
      
      expect(permissions).not.toContain(Permission.CREATE_ORG);
      expect(permissions).not.toContain(Permission.DELETE_ORG);
    });

    it('should have project management permissions', () => {
      const permissions = ROLE_PERMISSIONS[Role.ADMIN];
      
      expect(permissions).toContain(Permission.CREATE_PROJECT);
      expect(permissions).toContain(Permission.UPDATE_PROJECT);
    });
  });

  describe('MEMBER role', () => {
    it('should have limited permissions', () => {
      const permissions = ROLE_PERMISSIONS[Role.MEMBER];
      
      expect(permissions).toContain(Permission.CREATE_TASK);
      expect(permissions).toContain(Permission.CREATE_COMMENT);
      expect(permissions).not.toContain(Permission.DELETE_ORG);
      expect(permissions).not.toContain(Permission.DELETE_PROJECT);
    });
  });

  describe('GUEST role', () => {
    it('should have minimal permissions', () => {
      const permissions = ROLE_PERMISSIONS[Role.GUEST];
      
      expect(permissions).toContain(Permission.CREATE_COMMENT);
      expect(permissions).not.toContain(Permission.CREATE_TASK);
    });
  });
});
```

### 6. Run Tests

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

Run tests:

```bash
npm test
npm run test:coverage
```

## ✅ Verification Checklist

- [ ] All permission tests pass
- [ ] All role tests pass
- [ ] Tenant isolation tests verify user boundaries
- [ ] Integration tests confirm access control
- [ ] Admin can perform admin actions
- [ ] Members cannot perform owner actions
- [ ] Non-members cannot access organization
- [ ] Cross-tenant access is blocked
- [ ] Test coverage is above 80%
- [ ] CI/CD runs tests automatically

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
