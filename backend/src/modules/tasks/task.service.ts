import prisma from '@/config/database';
import { NotFoundError } from '@/shared/utils/errors';

/**
 * TaskService
 *
 * Encapsulates CRUD operations for `Task` entities.
 * Handles task creation, updates, positioning (for drag & drop), and assignment.
 *
 * Important behaviors:
 * - `createTask` auto-increments task numbers per project
 * - `moveTask` handles drag & drop by updating columnId and position
 * - `assignTask` and `unassignTask` handle user assignment
 */
export class TaskService {
  private async requireProjectInOrg(projectId: string, organizationId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }
  }

  private async requireColumnInProject(columnId: string, projectId: string) {
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: { projectId },
      },
      select: { id: true },
    });

    if (!column) {
      throw new NotFoundError('Column not found', 'COLUMN_NOT_FOUND');
    }
  }

  async createTask(organizationId: string, projectId: string, columnId: string, userId: string, data: {
    title: string;
    description?: string;
    assignedTo?: string;
  }) {
    await this.requireProjectInOrg(projectId, organizationId);
    await this.requireColumnInProject(columnId, projectId);

    // Get highest task number in project
    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { taskNumber: 'desc' }
    });

    const taskNumber = (lastTask?.taskNumber || 0) + 1;

    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        taskNumber,
        columnId,
        projectId,
        assignedTo: data.assignedTo,
        createdBy: userId,
        position: 0
      },
      include: { assignee: true, column: true }
    });
  }

  async getTasks(organizationId: string, projectId: string, columnId: string) {
    await this.requireProjectInOrg(projectId, organizationId);
    await this.requireColumnInProject(columnId, projectId);

    return prisma.task.findMany({
      where: { columnId, projectId },
      include: { assignee: true },
      orderBy: { position: 'asc' }
    });
  }

  async getTask(organizationId: string, projectId: string, taskId: string) {
    await this.requireProjectInOrg(projectId, organizationId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: {
        assignee: true,
        column: true,
        comments: true
      }
    });

    if (!task) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    return task;
  }

  async updateTask(organizationId: string, projectId: string, taskId: string, data: Partial<{
    title: string;
    description: string;
    assignedTo: string;
  }>) {
    await this.requireProjectInOrg(projectId, organizationId);

    const existing = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    return prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignee: true }
    });
  }

  async moveTask(organizationId: string, projectId: string, taskId: string, columnId: string, position: number) {
    await this.requireProjectInOrg(projectId, organizationId);
    await this.requireColumnInProject(columnId, projectId);

    const existing = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    return prisma.task.update({
      where: { id: taskId },
      data: {
        columnId,
        position
      },
      include: { column: true }
    });
  }

  async deleteTask(organizationId: string, projectId: string, taskId: string) {
    await this.requireProjectInOrg(projectId, organizationId);

    const existing = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    return prisma.task.delete({
      where: { id: taskId }
    });
  }

  async assignTask(organizationId: string, projectId: string, taskId: string, userId: string) {
    await this.requireProjectInOrg(projectId, organizationId);

    const existing = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    return prisma.task.update({
      where: { id: taskId },
      data: { assignedTo: userId },
      include: { assignee: true }
    });
  }

  async unassignTask(organizationId: string, projectId: string, taskId: string) {
    await this.requireProjectInOrg(projectId, organizationId);

    const existing = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }

    return prisma.task.update({
      where: { id: taskId },
      data: { assignedTo: null },
      include: { assignee: true }
    });
  }
}

export const taskService = new TaskService();
