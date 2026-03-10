# Lesson 3: Multi-Tenancy Security

## 🎯 Goal
Implement security measures to ensure data isolation and prevent unauthorized cross-tenant access.

## 📚 What You'll Learn
- Implement tenant isolation middleware
- Query-level security filters
- Prevent data leakage across tenants
- Implement secure API scoping

## 📋 Prerequisites
- Completed Phase 2 Lessons 1-2
- RBAC system working
- Organizations and members setup

## 🛠️ Tasks

### 1. Create Tenant Isolation Middleware

Create `backend/src/shared/middleware/tenantIsolation.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './rbac';

/**
 * Extract organization ID from request and verify user has access
 */
export const tenantGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = req.params.orgId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Verify user is member of organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.user.id
        }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Attach tenant context to request
    req.user.organizationId = orgId;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify resource belongs to correct tenant
 */
export const verifyResourceTenant = (resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user.organizationId;
      const resourceId = req.params[`${resourceType}Id`];

      let resource;

      switch (resourceType) {
        case 'project':
          resource = await prisma.project.findUnique({
            where: { id: resourceId }
          });
          break;
        case 'task':
          resource = await prisma.task.findUnique({
            where: { id: resourceId }
          });
          break;
        case 'board':
          resource = await prisma.board.findUnique({
            where: { id: resourceId }
          });
          break;
        default:
          return res.status(400).json({ error: 'Invalid resource type' });
      }

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Verify resource belongs to tenant's organization
      if (resource.organizationId !== orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Attach resource to request for later use
      req.body.resource = resource;

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};
```

### 2. Implement Secure Query Builder

Create `backend/src/shared/utils/secureQuery.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

/**
 * Wrapper for secure database queries with tenant isolation
 */
export class SecureQuery {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get projects for an organization with tenant check
   */
  async getProjectsForTenant(organizationId: string) {
    return this.prisma.project.findMany({
      where: {
        organizationId: {
          equals: organizationId
        }
      }
    });
  }

  /**
   * Get tasks for a project with tenant verification
   */
  async getTasksForProject(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: organizationId
      }
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.prisma.task.findMany({
      where: {
        projectId,
        project: {
          organizationId
        }
      }
    });
  }

  /**
   * Get organization members with isolation
   */
  async getOrganizationMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Get activity logs with tenant isolation
   */
  async getActivityLogs(organizationId: string, limit: number = 50) {
    // Only return activities for resources in this organization
    return this.prisma.activityLog.findMany({
      where: {
        OR: [
          {
            // Activities on projects in this org
            entityType: 'project',
            entityId: {
              in: await this.prisma.project.findMany({
                where: { organizationId },
                select: { id: true }
              }).then(p => p.map(proj => proj.id))
            }
          },
          {
            // Activities on tasks in this org's projects
            entityType: 'task',
            entityId: {
              in: await this.prisma.task.findMany({
                where: {
                  project: { organizationId }
                },
                select: { id: true }
              }).then(t => t.map(task => task.id))
            }
          },
          {
            // Direct organization activities
            entityType: 'organization',
            entityId: organizationId
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
```

### 3. Create Rate Limiting Middleware

Create `backend/src/shared/middleware/rateLimiter.ts`:

```typescript
import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

/**
 * Strict rate limiter for auth endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

/**
 * API rate limiter by organization
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req) => {
    return req.user?.organizationId || req.ip;
  }
});
```

### 4. Secure Data Access Pattern

Create `backend/src/shared/utils/dataAccess.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

/**
 * Helper to ensure all queries include tenant check
 */
export const withTenantCheck = {
  /**
   * Get a single project with tenant verification
   */
  async getProject(projectId: string, organizationId: string, prisma: PrismaClient) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId
      }
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return project;
  },

  /**
   * Get a single task with tenant verification
   */
  async getTask(taskId: string, organizationId: string, prisma: PrismaClient) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          organizationId
        }
      },
      include: {
        project: true,
        column: true,
        assignee: true
      }
    });

    if (!task) {
      throw new Error('Task not found or access denied');
    }

    return task;
  },

  /**
   * Get a single board with tenant verification
   */
  async getBoard(boardId: string, organizationId: string, prisma: PrismaClient) {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          organizationId
        }
      }
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return board;
  }
};
```

### 5. Apply Middleware to All Routes

Update your Express app setup:

```typescript
import { globalLimiter, authLimiter, apiLimiter } from './shared/middleware/rateLimiter';
import { tenantGuard, verifyResourceTenant } from './shared/middleware/tenantIsolation';

// Apply global rate limiter
app.use(globalLimiter);

// Auth routes with strict rate limiting
app.use('/api/auth', authLimiter);

// All API routes require tenant guard
app.use('/api/organizations/:orgId', authenticate, tenantGuard, apiLimiter);

// Resource verification for nested routes
app.use('/api/organizations/:orgId/projects/:projectId', verifyResourceTenant('project'));
app.use('/api/organizations/:orgId/projects/:projectId/tasks/:taskId', verifyResourceTenant('task'));
```

## ✅ Verification Checklist

- [ ] Tenant guard middleware blocks unauthorized users
- [ ] Users can only access their organization's data
- [ ] Resource verification prevents cross-tenant access
- [ ] Projects cannot be accessed by non-member users
- [ ] Tasks cannot be accessed across organization boundaries
- [ ] Activity logs are isolated by organization
- [ ] Rate limiting prevents abuse
- [ ] Auth endpoints have strict rate limiting
- [ ] All queries include tenant checks
- [ ] No data leakage between organizations

## 📚 Resources

- [Multi-Tenancy Security](https://www.microsoft.com/en-us/security/business/security-101/what-is-multi-tenancy)
- [OWASP Multi-Tenancy](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
