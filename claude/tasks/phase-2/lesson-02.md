# Lesson 2: Organization Invitations

## 🎯 Goal
Implement comprehensive organization invitation system with email notifications and token-based acceptance.

## 📚 What You'll Learn
- Create invitation endpoints
- Email notification system
- Invitation token management
- Invite acceptance with auto-joining

## 📋 Prerequisites
- Completed Phase 1 & Phase 2 Lesson 1
- RBAC middleware implemented
- Organization management working

## 🛠️ Tasks

### 1. Create Invitation Service

Create `backend/src/modules/invitations/invitation.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export class InvitationService {
  private transporter: any;

  constructor(private prisma: PrismaClient) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async createInvitation(
    organizationId: string,
    invitedBy: string,
    email: string,
    role: string = 'member'
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email,
        role,
        token,
        expiresAt,
        invitedBy
      },
      include: {
        organization: true,
        invitedByUser: true
      }
    });

    // Send invitation email
    await this.sendInvitationEmail(invitation, token);

    return invitation;
  }

  async sendInvitationEmail(invitation: any, token: string) {
    const inviteLink = `${process.env.FRONTEND_URL}/invitations/${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: invitation.email,
      subject: `Invitation to join ${invitation.organization.name}`,
      html: `
        <h2>You've been invited to join ${invitation.organization.name}</h2>
        <p>You've been invited by ${invitation.invitedByUser.name} to join as a ${invitation.role}.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${inviteLink}">${inviteLink}</a>
        <p>This invitation expires in 7 days.</p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Check if user already exists
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId
        }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Add user to organization
    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role
      }
    });

    // Delete invitation
    await this.prisma.organizationInvitation.delete({
      where: { id: invitation.id }
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        action: 'member_joined',
        entityType: 'organization',
        entityId: invitation.organizationId,
        userId,
        changes: { role: invitation.role }
      }
    });

    return member;
  }

  async resendInvitation(invitationId: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: true,
        invitedByUser: true
      }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    await this.sendInvitationEmail(invitation, invitation.token);
    return invitation;
  }

  async cancelInvitation(invitationId: string) {
    return this.prisma.organizationInvitation.delete({
      where: { id: invitationId }
    });
  }

  async getPendingInvitations(organizationId: string) {
    return this.prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        expiresAt: { gt: new Date() }
      },
      include: {
        invitedByUser: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUserInvitations(userEmail: string) {
    return this.prisma.organizationInvitation.findMany({
      where: {
        email: userEmail,
        expiresAt: { gt: new Date() }
      },
      include: {
        organization: true,
        invitedByUser: true
      }
    });
  }
}
```

### 2. Create Invitation Controller

Create `backend/src/modules/invitations/invitation.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { checkPermission, isOrganizationMember } from '../../shared/middleware/rbac';
import { InvitationService } from './invitation.service';
import { Permission } from '../../shared/types/roles';

const router = Router({ mergeParams: true });
const invitationService = new InvitationService(prisma);

// POST /api/organizations/:orgId/invitations - Create invitation
router.post('/',
  authenticate,
  isOrganizationMember,
  checkPermission(Permission.INVITE_MEMBERS),
  async (req: Request, res: Response) => {
    try {
      const { email, role } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const invitation = await invitationService.createInvitation(
        req.params.orgId,
        req.user.id,
        email,
        role || 'member'
      );

      res.status(201).json(invitation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/organizations/:orgId/invitations - Get pending invitations
router.get('/',
  authenticate,
  isOrganizationMember,
  async (req: Request, res: Response) => {
    try {
      const invitations = await invitationService.getPendingInvitations(req.params.orgId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/invitations/:token/accept - Accept invitation
router.post('/:token/accept',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const member = await invitationService.acceptInvitation(req.params.token, req.user.id);
      res.json({ message: 'Invitation accepted', member });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// GET /api/invitations - Get user's pending invitations
router.get('/me/pending',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const invitations = await invitationService.getUserInvitations(req.user.email);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/organizations/:orgId/invitations/:invitationId/resend - Resend invitation
router.post('/:invitationId/resend',
  authenticate,
  isOrganizationMember,
  checkPermission(Permission.INVITE_MEMBERS),
  async (req: Request, res: Response) => {
    try {
      const invitation = await invitationService.resendInvitation(req.params.invitationId);
      res.json({ message: 'Invitation resent', invitation });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/organizations/:orgId/invitations/:invitationId - Cancel invitation
router.delete('/:invitationId',
  authenticate,
  isOrganizationMember,
  checkPermission(Permission.INVITE_MEMBERS),
  async (req: Request, res: Response) => {
    try {
      await invitationService.cancelInvitation(req.params.invitationId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

### 3. Add Routes to Main App

```typescript
import invitationRouter from './modules/invitations/invitation.controller';

app.use('/api/organizations/:orgId/invitations', invitationRouter);
app.use('/api/invitations', invitationRouter);
```

### 4. Update Environment Variables

Add to `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com
FRONTEND_URL=http://localhost:3000
```

## ✅ Verification Checklist

- [ ] Invitations can be created with email and role
- [ ] Only authorized users can create invitations (INVITE_MEMBERS permission)
- [ ] Invitation emails are sent with unique token
- [ ] Invitations expire after 7 days
- [ ] GET returns pending invitations for organization
- [ ] Users can accept invitations with token
- [ ] Accepted invitations are deleted
- [ ] Users cannot accept duplicate invitations
- [ ] Invitations can be resent to user
- [ ] Invitations can be cancelled
- [ ] Get user's pending invitations endpoint works

## 📚 Resources

- [Nodemailer Setup](https://nodemailer.com/about/)
- [Email Best Practices](https://sendgrid.com/blog/10-best-practices-for-transactional-email/)
- [Token-Based Invitations](https://stripe.com/docs/connect/updating-managed-accounts)
