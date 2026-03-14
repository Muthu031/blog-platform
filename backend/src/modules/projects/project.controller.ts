import { Router, Request, Response } from 'express';
import { authenticate } from '@/shared/middleware/auth.middleware';
import { projectService } from './project.service';
import { requirePasswordResetCompleted } from '@/shared/middleware/first-login.middleware';
import { requireTenant, requireTenantMember } from '@/shared/middleware/tenant.middleware';
import { BadRequestError } from '@/shared/utils/errors';

const router = Router({ mergeParams: true });

/**
 * Project routes
 *
 * All routes are nested under `/api/organizations/:orgId/projects` and require
 * authentication. The `authenticate` middleware attaches `req.user` (JWT payload)
 * so handlers can determine the acting user.
 */

// All project routes require authentication + password reset completion + tenant access.
router.use(authenticate, requirePasswordResetCompleted, requireTenant, requireTenantMember);

// POST /api/organizations/:orgId/projects - Create project
// Body: { name, key, description? }
// Creates a project within the organization. Only org members may create projects.
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, key, description } = req.body;

    if (!name || !key) {
      throw new BadRequestError('Name and key required', 'INVALID_INPUT');
    }

    // Delegate creation to the service which enforces membership checks.
    const project = await projectService.createProject(
      req.tenant!.id,
      req.user!.sub,
      { name, key, description }
    );

    // Return the created project object under `data` (consistent API shape).
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/:orgId/projects - Get organization projects
// GET /api/organizations/:orgId/projects - Get organization projects
// Returns a list of projects for the organization, each including boards + columns.
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const projects = await projectService.getProjectsByOrganization(req.tenant!.id);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/:orgId/projects/:projectId - Get specific project
// GET /api/organizations/:orgId/projects/:projectId - Get specific project
// Returns project details including boards and columns.
router.get('/:projectId', async (req: Request, res: Response, next) => {
  try {
    const project = await projectService.getProject(req.params.projectId, req.tenant!.id);
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// PUT /api/organizations/:orgId/projects/:projectId - Update project
// PUT /api/organizations/:orgId/projects/:projectId - Update project
// Body: { name?, description? }
router.put('/:projectId', async (req: Request, res: Response, next) => {
  try {
    const { name, description } = req.body;
    const project = await projectService.updateProject(req.params.projectId, req.tenant!.id, { name, description });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/organizations/:orgId/projects/:projectId - Delete project
// DELETE /api/organizations/:orgId/projects/:projectId - Delete project
// Permanently deletes the project and its dependent records.
router.delete('/:projectId', async (req: Request, res: Response, next) => {
  try {
    await projectService.deleteProject(req.params.projectId, req.tenant!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/organizations/:orgId/projects/:projectId/boards - Create board
// POST /api/organizations/:orgId/projects/:projectId/boards - Create board
// Body: { name, description? }
// Creates a new board for the project and seeds default columns.
router.post('/:projectId/boards', async (req: Request, res: Response, next) => {
  try {
    const { name, description } = req.body;
    const board = await projectService.createBoard(req.params.projectId, req.tenant!.id, { name, description });
    res.status(201).json({ success: true, data: board });
  } catch (error) {
    next(error);
  }
});

// GET /api/organizations/:orgId/projects/:projectId/boards - Get project boards
// GET /api/organizations/:orgId/projects/:projectId/boards - Get project boards
// Returns all boards for a project along with columns and tasks.
router.get('/:projectId/boards', async (req: Request, res: Response, next) => {
  try {
    const boards = await projectService.getBoards(req.params.projectId, req.tenant!.id);
    res.json({ success: true, data: boards });
  } catch (error) {
    next(error);
  }
});

export default router;
