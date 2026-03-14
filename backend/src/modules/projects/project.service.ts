import prisma from '@/config/database';
import { ForbiddenError, NotFoundError } from '@/shared/utils/errors';

/**
 * ProjectService
 *
 * Encapsulates CRUD operations for `Project` and related `Board` entities.
 * Uses the shared `prisma` client to access the database.
 *
 * Important behaviors:
 * - `createProject` verifies that the creating user is a member of the organization
 *   before creating the project.
 * - `createBoard` will automatically create three default columns (Todo, In Progress, Done).
 */
export class ProjectService {
  async createProject(
    organizationId: string,
    userId: string,
    data: { name: string; description?: string; key: string }
  ) {
    // Verify user is a member of the organization. This prevents users outside the
    // org from creating projects within it.
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    if (!member) {
      // Caller should handle this error and convert to 403/validation as needed.
      throw new ForbiddenError('Access denied', 'TENANT_ACCESS_DENIED');
    }

    // Create the project record with a reference to the creating user.
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
    // Returns projects for an organization, including boards and their columns.
    // Used by the frontend to render project lists with summary board info.
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

  async getProject(projectId: string, organizationId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        boards: {
          include: { columns: true }
        }
      }
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    return project;
  }

  async updateProject(
    projectId: string,
    organizationId: string,
    data: Partial<{ name: string; description: string }>
  ) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    return prisma.project.update({
      where: { id: projectId },
      data
    });
  }

  async deleteProject(projectId: string, organizationId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    return prisma.project.delete({
      where: { id: projectId }
    });
  }

  async createBoard(projectId: string, organizationId: string, data: { name: string; description?: string }) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    // Create a board and seed it with three default columns for a Kanban workflow.
    // The default columns are created with explicit positions so the frontend
    // can render them in order.
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

  async getBoards(projectId: string, organizationId: string) {
    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    // Return all boards for a project including each column and their tasks.
    // Boards are ordered by position to preserve UI order.
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
