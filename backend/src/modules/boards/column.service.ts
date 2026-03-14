import prisma from '@/config/database';

/**
 * ColumnService
 *
 * Encapsulates CRUD operations for `Column` entities.
 * Columns represent the different stages in a Kanban board (e.g., Todo, In Progress, Done).
 */
export class ColumnService {
  async createColumn(boardId: string, data: {
    name: string;
    position: number;
  }) {
    return prisma.column.create({
      data: {
        name: data.name,
        position: data.position,
        boardId
      }
    });
  }

  async getColumns(boardId: string) {
    return prisma.column.findMany({
      where: { boardId },
      include: { tasks: true },
      orderBy: { position: 'asc' }
    });
  }

  async updateColumn(columnId: string, data: Partial<{
    name: string;
    position: number;
  }>) {
    return prisma.column.update({
      where: { id: columnId },
      data
    });
  }

  async deleteColumn(columnId: string) {
    return prisma.column.delete({
      where: { id: columnId }
    });
  }
}

export const columnService = new ColumnService();
