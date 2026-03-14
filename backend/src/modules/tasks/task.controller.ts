import { Router, Request, Response } from 'express';
import { authenticate } from '@/shared/middleware/auth.middleware';
import { taskService } from './task.service';
import { requirePasswordResetCompleted } from '@/shared/middleware/first-login.middleware';
import { requireTenant, requireTenantMember } from '@/shared/middleware/tenant.middleware';
import { BadRequestError } from '@/shared/utils/errors';

const router = Router({ mergeParams: true });

/**
 * Task routes
 *
 * Routes for CRUD operations on tasks within a project.
 * All routes require authentication and operate within an organization/project context.
 *
 * Routes:
 * - POST   /:projectId/columns/:columnId/tasks           - Create task
 * - GET    /:projectId/columns/:columnId/tasks           - Get column tasks
 * - GET    /:projectId/tasks/:taskId                     - Get specific task
 * - PUT    /:projectId/tasks/:taskId                     - Update task
 * - PATCH  /:projectId/tasks/:taskId/move                - Move task to different column
 * - PATCH  /:projectId/tasks/:taskId/assign              - Assign task to user
 * - PATCH  /:projectId/tasks/:taskId/unassign            - Unassign task
 * - DELETE /:projectId/tasks/:taskId                     - Delete task
 */

// POST /api/organizations/:orgId/projects/:projectId/columns/:columnId/tasks - Create task
router.use(authenticate, requirePasswordResetCompleted, requireTenant, requireTenantMember);

router.post('/:projectId/columns/:columnId/tasks', async (req: Request, res: Response, next) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title) {
      throw new BadRequestError('Title required', 'INVALID_INPUT');
    }

    const task = await taskService.createTask(
      req.tenant!.id,
      req.params.projectId,
      req.params.columnId,
      req.user!.sub,
      { title, description, assignedTo }
    );

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/:orgId/projects/:projectId/columns/:columnId/tasks - Get column tasks
router.get('/:projectId/columns/:columnId/tasks', async (req: Request, res: Response, next) => {
  try {
    const tasks = await taskService.getTasks(req.tenant!.id, req.params.projectId, req.params.columnId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/:orgId/projects/:projectId/tasks/:taskId - Get specific task
router.get('/:projectId/tasks/:taskId', async (req: Request, res: Response, next) => {
  try {
    const task = await taskService.getTask(req.tenant!.id, req.params.projectId, req.params.taskId);
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// PUT /api/organizations/:orgId/projects/:projectId/tasks/:taskId - Update task
router.put('/:projectId/tasks/:taskId', async (req: Request, res: Response, next) => {
  try {
    const { title, description, assignedTo } = req.body;
    const task = await taskService.updateTask(req.tenant!.id, req.params.projectId, req.params.taskId, {
      title,
      description,
      assignedTo
    });
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId/move - Move task to different column
router.patch('/:projectId/tasks/:taskId/move', async (req: Request, res: Response, next) => {
  try {
    const { columnId, position } = req.body;

    if (!columnId || position === undefined) {
      throw new BadRequestError('columnId and position required', 'INVALID_INPUT');
    }

    const task = await taskService.moveTask(req.tenant!.id, req.params.projectId, req.params.taskId, columnId, position);
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId/assign - Assign task to user
router.patch('/:projectId/tasks/:taskId/assign', async (req: Request, res: Response, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new BadRequestError('userId required', 'INVALID_INPUT');
    }

    const task = await taskService.assignTask(req.tenant!.id, req.params.projectId, req.params.taskId, userId);
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId/unassign - Unassign task
router.patch('/:projectId/tasks/:taskId/unassign', async (req: Request, res: Response, next) => {
  try {
    const task = await taskService.unassignTask(req.tenant!.id, req.params.projectId, req.params.taskId);
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/organizations/:orgId/projects/:projectId/tasks/:taskId - Delete task
router.delete('/:projectId/tasks/:taskId', async (req: Request, res: Response, next) => {
  try {
    await taskService.deleteTask(req.tenant!.id, req.params.projectId, req.params.taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
