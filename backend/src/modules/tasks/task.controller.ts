import { Router, Request, Response } from 'express';
import { authenticate } from '@/shared/middleware/auth.middleware';
import { taskService } from './task.service';

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
router.post('/:projectId/columns/:columnId/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: { message: 'Title required', statusCode: 400 } });
    }

    const task = await taskService.createTask(
      req.params.columnId,
      req.params.projectId,
      req.user!.sub,
      { title, description, assignedTo }
    );

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects/:projectId/columns/:columnId/tasks - Get column tasks
router.get('/:projectId/columns/:columnId/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const tasks = await taskService.getTasks(req.params.columnId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects/:projectId/tasks/:taskId - Get specific task
router.get('/:projectId/tasks/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: { message: 'Task not found', statusCode: 404 } });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// PUT /api/organizations/:orgId/projects/:projectId/tasks/:taskId - Update task
router.put('/:projectId/tasks/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, assignedTo } = req.body;
    const task = await taskService.updateTask(req.params.taskId, {
      title,
      description,
      assignedTo
    });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId/move - Move task to different column
router.patch('/:projectId/tasks/:taskId/move', authenticate, async (req: Request, res: Response) => {
  try {
    const { columnId, position } = req.body;

    if (!columnId || position === undefined) {
      return res.status(400).json({ success: false, error: { message: 'columnId and position required', statusCode: 400 } });
    }

    const task = await taskService.moveTask(req.params.taskId, columnId, position);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId/assign - Assign task to user
router.patch('/:projectId/tasks/:taskId/assign', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: { message: 'userId required', statusCode: 400 } });
    }

    const task = await taskService.assignTask(req.params.taskId, userId);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// PATCH /api/organizations/:orgId/projects/:projectId/tasks/:taskId/unassign - Unassign task
router.patch('/:projectId/tasks/:taskId/unassign', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await taskService.unassignTask(req.params.taskId);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// DELETE /api/organizations/:orgId/projects/:projectId/tasks/:taskId - Delete task
router.delete('/:projectId/tasks/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    await taskService.deleteTask(req.params.taskId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

export default router;
