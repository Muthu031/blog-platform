import prisma from '@/config/database';
import crypto from 'crypto';

export class InvitationService {
  async createInvitation(organizationId: string, email: string, role: string = 'member', invitedBy: string) {
    const token = crypto.randomBytes(32).toString('hex');

    // Check if an active invitation already exists for this email
    const existing = await prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existing) {
      throw new Error('An active invitation already exists for this email');
    }

    return prisma.invitation.create({
      data: {
        organizationId,
        email,
        role,
        token,
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });
  }

  async getInvitation(token: string) {
    return prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
  }

  async getOrganizationInvitations(organizationId: string) {
    return prisma.invitation.findMany({
      where: {
        organizationId,
        acceptedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Check if user is already a member
    const existing = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId
      }
    });

    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    // Add user to organization
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() }
    });

    return {
      member,
      organization: await prisma.organization.findUnique({
        where: { id: invitation.organizationId },
        select: {
          id: true,
          name: true,
          slug: true
        }
      })
    };
  }

  async revokeInvitation(invitationId: string) {
    return prisma.invitation.delete({
      where: { id: invitationId }
    });
  }

  async revokeInvitationByToken(token: string) {
    return prisma.invitation.delete({
      where: { token }
    });
  }
}

export const invitationService = new InvitationService();
