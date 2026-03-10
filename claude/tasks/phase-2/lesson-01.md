# Lesson 1: RBAC Middleware Implementation

## 🎯 Goal
Implement Role-Based Access Control (RBAC) middleware for protecting routes and enforcing permissions.

## 📚 What You'll Learn
- RBAC fundamentals and role hierarchy
- Create permission middleware
- Implement role checking decorators
- Create resource-level permissions

## 📋 Prerequisites
- Completed Phase 1
- Organizations with member roles working
- Authentication middleware in place

## 🛠️ Tasks

### 1. Define Roles and Permissions

Create `backend/src/shared/types/roles.ts`:

```typescript
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

export enum Permission {
  // Organization permissions
  CREATE_ORG = 'create:organization',
  UPDATE_ORG = 'update:organization',
  DELETE_ORG = 'delete:organization',
  MANAGE_MEMBERS = 'manage:members',
  INVITE_MEMBERS = 'invite:members',

  // Project permissions
  CREATE_PROJECT = 'create:project',
  UPDATE_PROJECT = 'update:project',
  DELETE_PROJECT = 'delete:project',
  MANAGE_PROJECT = 'manage:project',

  // Task permissions
  CREATE_TASK = 'create:task',
  UPDATE_TASK = 'update:task',
  DELETE_TASK = 'delete:task',
  ASSIGN_TASK = 'assign:task',

  // Comment permissions
  CREATE_COMMENT = 'create:comment',
  UPDATE_COMMENT = 'update:comment',
  DELETE_COMMENT = 'delete:comment'
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.CREATE_ORG,
    Permission.UPDATE_ORG,
    Permission.DELETE_ORG,
    Permission.MANAGE_MEMBERS,
    Permission.INVITE_MEMBERS,
    Permission.CREATE_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.MANAGE_PROJECT,
    Permission.CREATE_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    Permission.CREATE_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT
  ],
  [Role.ADMIN]: [
    Permission.UPDATE_ORG,
    Permission.INVITE_MEMBERS,
    Permission.CREATE_PROJECT,
    Permission.UPDATE_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.MANAGE_PROJECT,
    Permission.CREATE_TASK,
    Permission.UPDATE_TASK,
    Permission.DELETE_TASK,
    Permission.ASSIGN_TASK,
    Permission.CREATE_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT
  ],
  [Role.MEMBER]: [
    Permission.CREATE_PROJECT,
    Permission.CREATE_TASK,
    Permission.UPDATE_TASK,
    Permission.ASSIGN_TASK,
    Permission.CREATE_COMMENT,
    Permission.UPDATE_COMMENT,
    Permission.DELETE_COMMENT
  ],
  [Role.GUEST]: [
    Permission.CREATE_COMMENT
  ]
};
```

### 2. Create RBAC Middleware

Create `backend/src/shared/middleware/rbac.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { Role, Permission, ROLE_PERMISSIONS } from '../types/roles';

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: Role;
    organizationId?: string;
    permissions?: Permission[];
  };
}

export const checkPermission = (requiredPermission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userPermissions = req.user.permissions || [];

      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermission
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

export const checkRole = (...roles: Role[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user.role || !roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient role',
          required: roles
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

export const isOrganizationOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = req.params.orgId;
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.user.id
        }
      }
    });

    if (!member || member.role !== Role.OWNER) {
      return res.status(403).json({ error: 'Only organization owners can perform this action' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const isOrganizationMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = req.params.orgId;
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.user.id
        }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'User is not a member of this organization' });
    }

    // Attach user role and permissions to request
    req.user.role = member.role as Role;
    req.user.permissions = ROLE_PERMISSIONS[member.role as Role];

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 3. Create Permission Seeding

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'hashed_password_here' // Use bcrypt in real app
    }
  });

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      members: {
        connect: { id: user.id }
      }
    }
  });

  console.log('Seeding completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 4. Update Authentication Middleware

Update `backend/src/shared/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ROLE_PERMISSIONS } from '../types/roles';

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
    permissions?: string[];
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: ROLE_PERMISSIONS[decoded.role] || []
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 5. Apply RBAC to Routes

Update project routes with permission checks:

```typescript
import { checkPermission, isOrganizationMember } from '../../shared/middleware/rbac';

router.post('/', 
  authenticate,
  isOrganizationMember,
  checkPermission(Permission.CREATE_PROJECT),
  async (req, res) => {
    // Create project
  }
);

router.delete('/:projectId',
  authenticate,
  isOrganizationMember,
  checkPermission(Permission.DELETE_PROJECT),
  async (req, res) => {
    // Delete project
  }
);
```

## ✅ Verification Checklist

- [ ] All roles are properly defined (owner, admin, member, guest)
- [ ] Permission mappings are correct for each role
- [ ] isOrganizationMember middleware checks membership
- [ ] isOrganizationOwner middleware checks ownership
- [ ] checkPermission middleware enforces specific permissions
- [ ] checkRole middleware enforces role requirements
- [ ] Unauthorized requests return 403
- [ ] Unauthenticated requests return 401
- [ ] User permissions are attached to request
- [ ] All protected routes have appropriate middleware

## 📚 Resources

- [RBAC Pattern](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [JWT Patterns](https://auth0.com/learn/json-web-tokens/)
