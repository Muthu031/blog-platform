import prisma from '@/config/database';
import { Organization } from '@prisma/client';

export class OrganizationService {
  async createOrganization(
    userId: string,
    data: {
      name: string;
      slug: string;
    }
  ): Promise<Organization> {
    return prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        members: {
          create: {
            userId,
            role: 'owner',
            invitedBy: userId
          }
        }
      }
    });
  }

  async getOrganizationsByUser(userId: string) {
    return prisma.organization.findMany({
      where: {
        members: {
          some: { userId }
        },
        deletedAt: null
      },
      include: {
        members: {
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getOrganization(orgId: string) {
    return prisma.organization.findUnique({
      where: { id: orgId, deletedAt: null },
      include: {
        members: {
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
        }
      }
    });
  }

  async updateOrganization(
    orgId: string,
    data: Partial<{
      name: string;
    }>
  ) {
    return prisma.organization.update({
      where: { id: orgId },
      data,
      include: {
        members: {
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
        }
      }
    });
  }

  async deleteOrganization(orgId: string) {
    return prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() }
    });
  }

  async checkUserOrganizationAccess(userId: string, orgId: string) {
    return prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: orgId
      }
    });
  }
}

export const organizationService = new OrganizationService();
