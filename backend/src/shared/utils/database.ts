import prisma from '@/config/database';

/**
 * Get next task number for a project
 */
export async function getNextTaskNumber(projectId: string): Promise<number> {
  const lastTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { taskNumber: 'desc' },
    select: { taskNumber: true },
  });

  return (lastTask?.taskNumber || 0) + 1;
}

/**
 * Soft delete helper
 */
export async function softDelete<T extends { deletedAt?: Date | null }>(
  model: any,
  id: string
): Promise<T> {
  return model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Check if user has access to organization
 */
export async function hasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  return !!member;
}
