import { Router, Request, Response } from 'express';
import { authenticate } from '@/shared/middleware/auth.middleware';
import prisma from '@/config/database';
import { projectService } from './project.service';

const router = Router({ mergeParams: true });

/**
 * Project routes
 *
 * All routes are nested under `/api/organizations/:orgId/projects` and require
 * authentication. The `authenticate` middleware attaches `req.user` (JWT payload)
 * so handlers can determine the acting user.
 */

// POST /api/organizations/:orgId/projects - Create project
// Body: { name, key, description? }
// Creates a project within the organization. Only org members may create projects.
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, key, description } = req.body;

    if (!name || !key) {
      return res.status(400).json({ success: false, error: { message: 'Name and key required', statusCode: 400 } });
    }

    // Delegate creation to the service which enforces membership checks.
    const project = await projectService.createProject(
      req.params.orgId,
      req.user!.sub,
      { name, key, description }
    );

    // Return the created project object under `data` (consistent API shape).
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects - Get organization projects
// GET /api/organizations/:orgId/projects - Get organization projects
// Returns a list of projects for the organization, each including boards + columns.
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getProjectsByOrganization(req.params.orgId);
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects/:projectId - Get specific project
// GET /api/organizations/:orgId/projects/:projectId - Get specific project
// Returns project details including boards and columns.
router.get('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProject(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found', statusCode: 404 } });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// PUT /api/organizations/:orgId/projects/:projectId - Update project
// PUT /api/organizations/:orgId/projects/:projectId - Update project
// Body: { name?, description? }
router.put('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const project = await projectService.updateProject(req.params.projectId, { name, description });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// DELETE /api/organizations/:orgId/projects/:projectId - Delete project
// DELETE /api/organizations/:orgId/projects/:projectId - Delete project
// Permanently deletes the project and its dependent records.
router.delete('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    await projectService.deleteProject(req.params.projectId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// POST /api/organizations/:orgId/projects/:projectId/boards - Create board
// POST /api/organizations/:orgId/projects/:projectId/boards - Create board
// Body: { name, description? }
// Creates a new board for the project and seeds default columns.
router.post('/:projectId/boards', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const board = await projectService.createBoard(req.params.projectId, { name, description });
    res.status(201).json({ success: true, data: board });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects/:projectId/boards - Get project boards
// GET /api/organizations/:orgId/projects/:projectId/boards - Get project boards
// Returns all boards for a project along with columns and tasks.
router.get('/:projectId/boards', authenticate, async (req: Request, res: Response) => {
  try {
    const boards = await projectService.getBoards(req.params.projectId);
    res.json({ success: true, data: boards });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

export default router;
