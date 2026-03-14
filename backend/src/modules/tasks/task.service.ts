import prisma from '@/config/database';

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
  async createTask(columnId: string, projectId: string, userId: string, data: {
    title: string;
    description?: string;
    assignedTo?: string;
  }) {
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

  async getTasks(columnId: string) {
    return prisma.task.findMany({
      where: { columnId },
      include: { assignee: true },
      orderBy: { position: 'asc' }
    });
  }

  async getTask(taskId: string) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        column: true,
        comments: true
      }
    });
  }

  async updateTask(taskId: string, data: Partial<{
    title: string;
    description: string;
    assignedTo: string;
  }>) {
    return prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignee: true }
    });
  }

  async moveTask(taskId: string, columnId: string, position: number) {
    return prisma.task.update({
      where: { id: taskId },
      data: {
        columnId,
        position
      },
      include: { column: true }
    });
  }

  async deleteTask(taskId: string) {
    return prisma.task.delete({
      where: { id: taskId }
    });
  }

  async assignTask(taskId: string, userId: string) {
    return prisma.task.update({
      where: { id: taskId },
      data: { assignedTo: userId },
      include: { assignee: true }
    });
  }

  async unassignTask(taskId: string) {
    return prisma.task.update({
      where: { id: taskId },
      data: { assignedTo: null },
      include: { assignee: true }
    });
  }
}

export const taskService = new TaskService();
