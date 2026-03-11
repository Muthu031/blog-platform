import prisma from '@/config/database';

export class ProjectService {
  async createProject(
    organizationId: string,
    userId: string,
    data: { name: string; description?: string; key: string }
  ) {
    // Verify user is a member of the organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    if (!member) {
      throw new Error('User is not a member of this organization');
    }

    return prisma.project.create({
      data: {
        name: data.name,
        key: data.key,
        description: data.description,
        organizationId,
        createdBy: userId
      }
    });
  }

  async getProjectsByOrganization(organizationId: string) {
    return prisma.project.findMany({
      where: { organizationId },
      include: {
        boards: {
          include: { columns: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getProject(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        boards: {
          include: { columns: true }
        }
      }
    });
  }

  async updateProject(projectId: string, data: Partial<{ name: string; description: string }>) {
    return prisma.project.update({
      where: { id: projectId },
      data
    });
  }

  async deleteProject(projectId: string) {
    return prisma.project.delete({
      where: { id: projectId }
    });
  }

  async createBoard(projectId: string, data: { name: string; description?: string }) {
    return prisma.board.create({
      data: {
        name: data.name,
        settings: {},
        projectId,
        columns: {
          create: [
            { name: 'Todo', position: 0 },
            { name: 'In Progress', position: 1 },
            { name: 'Done', position: 2 }
          ]
        }
      },
      include: { columns: true }
    });
  }

  async getBoards(projectId: string) {
    return prisma.board.findMany({
      where: { projectId },
      include: {
        columns: {
          include: { tasks: true }
        }
      },
      orderBy: { position: 'asc' }
    });
  }
}

export const projectService = new ProjectService();
