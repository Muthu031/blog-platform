# Lesson 4: Organizations CRUD

## 🎯 Goal
Implement multi-tenant organization management with member roles and invitations.

## 📚 What You'll Learn
- Create organization CRUD endpoints
- Implement multi-tenancy middleware
- Manage organization members and roles
- Create organization invitation system

## 📋 Prerequisites
- Completed Lessons 1-3
- Authentication system working
- Database with Organization and OrganizationMember models

## 🛠️ Tasks

### 1. Create Organization Service

Create `backend/src/modules/organizations/organization.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class OrganizationService {
  constructor(private prisma: PrismaClient) {}

  async createOrganization(userId: string, data: {
    name: string;
    slug: string;
    description?: string;
  }) {
    return this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        members: {
          create: {
            userId,
            role: 'owner'
          }
        }
      },
      include: { members: true }
    });
  }

  async getOrganizationsByUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: { user: true }
        }
      }
    });
  }

  async getOrganization(orgId: string) {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: { user: true }
        }
      }
    });
  }

  async updateOrganization(orgId: string, data: Partial<{
    name: string;
    description: string;
  }>) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data,
      include: { members: true }
    });
  }

  async deleteOrganization(orgId: string) {
    return this.prisma.organization.delete({
      where: { id: orgId }
    });
  }
}
```

### 2. Create Organization Controller

Create `backend/src/modules/organizations/organization.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { OrganizationService } from './organization.service';

const router = Router();
const orgService = new OrganizationService(prisma);

// POST /api/organizations - Create new organization
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, slug, description } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug required' });
    }

    const organization = await orgService.createOrganization(req.user.id, {
      name,
      slug,
      description
    });

    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations - Get user's organizations
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizations = await orgService.getOrganizationsByUser(req.user.id);
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations/:id - Get specific organization
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organization = await orgService.getOrganization(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/organizations/:id - Update organization
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const organization = await orgService.updateOrganization(req.params.id, {
      name,
      description
    });
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await orgService.deleteOrganization(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Create Member Management Endpoints

Create `backend/src/modules/organizations/member.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

// POST /api/organizations/:id/members/:userId/role - Update member role
router.post('/:id/members/:userId/role', authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    
    if (!['member', 'admin', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = await prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: req.params.id,
          userId: req.params.userId
        }
      },
      data: { role }
    });

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/organizations/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: req.params.id,
          userId: req.params.userId
        }
      }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 4. Create Organization Invitation System

Create `backend/src/modules/organizations/invitation.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export class InvitationService {
  constructor(private prisma: PrismaClient) {}

  async createInvitation(organizationId: string, email: string, role: string = 'member') {
    const token = crypto.randomBytes(32).toString('hex');
    
    return this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { token }
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation');
    }

    // Add user to organization
    await this.prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role
      }
    });

    // Mark invitation as used
    await this.prisma.organizationInvitation.delete({
      where: { id: invitation.id }
    });

    return invitation;
  }

  async revokeInvitation(invitationId: string) {
    return this.prisma.organizationInvitation.delete({
      where: { id: invitationId }
    });
  }
}
```

## ✅ Verification Checklist

- [ ] POST /api/organizations creates org and sets current user as owner
- [ ] GET /api/organizations returns user's organizations
- [ ] GET /api/organizations/:id returns org details with members
- [ ] PUT /api/organizations/:id updates org details
- [ ] DELETE /api/organizations/:id removes organization
- [ ] Member roles can be updated (member, admin, owner)
- [ ] Members can be removed from organization
- [ ] Invitations can be created with token
- [ ] Invitations expire after 7 days
- [ ] Users can accept invitations

## 📚 Resources

- [Prisma Relations](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#relations)
- [Express Routing](https://expressjs.com/en/guide/routing.html)
- [JWT Patterns](https://tools.ietf.org/html/rfc7519)
