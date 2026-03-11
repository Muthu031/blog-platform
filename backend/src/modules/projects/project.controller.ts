import { Router, Request, Response } from 'express';
import { authenticate } from '@/shared/middleware/auth.middleware';
import prisma from '@/config/database';
import { projectService } from './project.service';

const router = Router({ mergeParams: true });

// POST /api/organizations/:orgId/projects - Create project
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, key, description } = req.body;

    if (!name || !key) {
      return res.status(400).json({ success: false, error: { message: 'Name and key required', statusCode: 400 } });
    }

    const project = await projectService.createProject(
      req.params.orgId,
      req.user!.sub,
      { name, key, description }
    );

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects - Get organization projects
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getProjectsByOrganization(req.params.orgId);
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// GET /api/organizations/:orgId/projects/:projectId - Get specific project
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
router.delete('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    await projectService.deleteProject(req.params.projectId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

// POST /api/organizations/:orgId/projects/:projectId/boards - Create board
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
router.get('/:projectId/boards', authenticate, async (req: Request, res: Response) => {
  try {
    const boards = await projectService.getBoards(req.params.projectId);
    res.json({ success: true, data: boards });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error instanceof Error ? error.message : 'Internal error', statusCode: 500 } });
  }
});

export default router;
