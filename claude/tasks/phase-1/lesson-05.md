# Lesson 5: Projects Management

## 🎯 Goal
Implement project CRUD operations with project-level permissions and board setup.

## 📚 What You'll Learn
- Create project endpoints (CRUD)
- Implement project-level access control
- Set up project boards
- Link projects to organizations

## 📋 Prerequisites
- Completed Lessons 1-4
- Organizations system working
- Project and Board models in schema

## 🛠️ Tasks

### 1. Create Project Service

Create `backend/src/modules/projects/project.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async createProject(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    slug: string;
  }) {
    // Verify user is member of organization
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    if (!member) {
      throw new Error('User is not a member of this organization');
    }

    return this.prisma.project.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        organizationId,
        createdById: userId
      }
    });
  }

  async getProjectsByOrganization(organizationId: string) {
    return this.prisma.project.findMany({
      where: { organizationId },
      include: {
        boards: {
          include: { columns: true }
        }
      }
    });
  }

  async getProject(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        boards: {
          include: { columns: true }
        }
      }
    });
  }

  async updateProject(projectId: string, data: Partial<{
    name: string;
    description: string;
  }>) {
    return this.prisma.project.update({
      where: { id: projectId },
      data
    });
  }

  async deleteProject(projectId: string) {
    return this.prisma.project.delete({
      where: { id: projectId }
    });
  }

  async createBoard(projectId: string, data: {
    name: string;
    description?: string;
  }) {
    return this.prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
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

  async getBoards(projectId: string) {
    return this.prisma.board.findMany({
      where: { projectId },
      include: {
        columns: {
          include: { tasks: true }
        }
      }
    });
  }
}
```

### 2. Create Project Controller

Create `backend/src/modules/projects/project.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { ProjectService } from './project.service';

const router = Router({ mergeParams: true });
const projectService = new ProjectService(prisma);

// POST /api/organizations/:orgId/projects - Create project
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, slug, description } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug required' });
    }

    const project = await projectService.createProject(
      req.params.orgId,
      req.user.id,
      { name, slug, description }
    );

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations/:orgId/projects - Get organization projects
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await projectService.getProjectsByOrganization(req.params.orgId);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations/:orgId/projects/:projectId - Get specific project
router.get('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProject(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/organizations/:orgId/projects/:projectId - Update project
router.put('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const project = await projectService.updateProject(req.params.projectId, {
      name,
      description
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/organizations/:orgId/projects/:projectId - Delete project
router.delete('/:projectId', authenticate, async (req: Request, res: Response) => {
  try {
    await projectService.deleteProject(req.params.projectId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/organizations/:orgId/projects/:projectId/boards - Create board
router.post('/:projectId/boards', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const board = await projectService.createBoard(req.params.projectId, {
      name,
      description
    });
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizations/:orgId/projects/:projectId/boards - Get project boards
router.get('/:projectId/boards', authenticate, async (req: Request, res: Response) => {
  try {
    const boards = await projectService.getBoards(req.params.projectId);
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Update Main App Router

Add project routes to your main Express app:

```typescript
import projectRouter from './modules/projects/project.controller';

app.use('/api/organizations/:orgId/projects', projectRouter);
```

## ✅ Verification Checklist

- [ ] POST creates project under organization
- [ ] Only org members can create projects
- [ ] GET returns projects by organization
- [ ] GET specific project returns details with boards
- [ ] PUT updates project information
- [ ] DELETE removes project
- [ ] Default board with 3 columns is created automatically
- [ ] Boards can be created for projects
- [ ] Boards include default columns (Todo, In Progress, Done)

## 📚 Resources

- [Express Nested Routes](https://expressjs.com/en/guide/routing.html)
- [Prisma Nested Creates](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#create)
- [REST API Design](https://restfulapi.net/)
