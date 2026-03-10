# Lesson 6: Tasks & Boards

## 🎯 Goal
Implement Kanban board functionality with task CRUD, assignment, and positioning.

## 📚 What You'll Learn
- Create board and column endpoints
- Implement task CRUD operations
- Add task assignment functionality
- Implement task positioning (drag & drop backend)
- Create auto-incrementing task numbers

## 📋 Prerequisites
- Completed Lessons 1-5
- Projects and boards system working
- Task and BoardColumn models in schema

## 🛠️ Tasks

### 1. Create Board Column Service

Create `backend/src/modules/boards/column.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class ColumnService {
  constructor(private prisma: PrismaClient) {}

  async createColumn(boardId: string, data: {
    name: string;
    position: number;
  }) {
    return this.prisma.boardColumn.create({
      data: {
        name: data.name,
        position: data.position,
        boardId
      }
    });
  }

  async getColumns(boardId: string) {
    return this.prisma.boardColumn.findMany({
      where: { boardId },
      include: { tasks: true },
      orderBy: { position: 'asc' }
    });
  }

  async updateColumn(columnId: string, data: Partial<{
    name: string;
    position: number;
  }>) {
    return this.prisma.boardColumn.update({
      where: { id: columnId },
      data
    });
  }

  async deleteColumn(columnId: string) {
    return this.prisma.boardColumn.delete({
      where: { id: columnId }
    });
  }
}
```

### 2. Create Task Service

Create `backend/src/modules/tasks/task.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class TaskService {
  constructor(private prisma: PrismaClient) {}

  async createTask(columnId: string, projectId: string, data: {
    title: string;
    description?: string;
    assigneeId?: string;
  }) {
    // Get highest task number in project
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId },
      orderBy: { taskNumber: 'desc' }
    });

    const taskNumber = (lastTask?.taskNumber || 0) + 1;

    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        taskNumber,
        columnId,
        projectId,
        assigneeId: data.assigneeId,
        position: 0
      },
      include: { assignee: true, column: true }
    });
  }

  async getTasks(columnId: string) {
    return this.prisma.task.findMany({
      where: { columnId },
      include: { assignee: true },
      orderBy: { position: 'asc' }
    });
  }

  async getTask(taskId: string) {
    return this.prisma.task.findUnique({
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
    assigneeId: string;
  }>) {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignee: true }
    });
  }

  async moveTask(taskId: string, columnId: string, position: number) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        columnId,
        position
      },
      include: { column: true }
    });
  }

  async deleteTask(taskId: string) {
    return this.prisma.task.delete({
      where: { id: taskId }
    });
  }

  async assignTask(taskId: string, userId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: userId },
      include: { assignee: true }
    });
  }

  async unassignTask(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: null },
      include: { assignee: true }
    });
  }
}
```

### 3. Create Task Controller

Create `backend/src/modules/tasks/task.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { TaskService } from './task.service';

const router = Router({ mergeParams: true });
const taskService = new TaskService(prisma);

// POST /api/projects/:projectId/columns/:columnId/tasks - Create task
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, assigneeId } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const task = await taskService.createTask(
      req.params.columnId,
      req.params.projectId,
      { title, description, assigneeId }
    );

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/columns/:columnId/tasks - Get column tasks
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tasks = await taskService.getTasks(req.params.columnId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/tasks/:taskId - Get specific task
router.get('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId - Update task
router.put('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, assigneeId } = req.body;
    const task = await taskService.updateTask(req.params.taskId, {
      title,
      description,
      assigneeId
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId/move - Move task to different column
router.patch('/:taskId/move', authenticate, async (req: Request, res: Response) => {
  try {
    const { columnId, position } = req.body;
    
    if (!columnId || position === undefined) {
      return res.status(400).json({ error: 'columnId and position required' });
    }

    const task = await taskService.moveTask(req.params.taskId, columnId, position);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId/assign - Assign task to user
router.patch('/:taskId/assign', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const task = await taskService.assignTask(req.params.taskId, userId);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId/unassign - Unassign task
router.patch('/:taskId/unassign', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await taskService.unassignTask(req.params.taskId);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId - Delete task
router.delete('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    await taskService.deleteTask(req.params.taskId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 4. Add Routes to Main App

```typescript
import taskRouter from './modules/tasks/task.controller';

app.use('/api/projects/:projectId/columns/:columnId/tasks', taskRouter);
```

## ✅ Verification Checklist

- [ ] Tasks are created with auto-incrementing task numbers
- [ ] POST creates task in specified column
- [ ] GET returns tasks ordered by position
- [ ] GET specific task includes assignee and comments
- [ ] PUT updates task information
- [ ] PATCH /move updates column and position
- [ ] PATCH /assign assigns task to user
- [ ] PATCH /unassign removes task assignment
- [ ] DELETE removes task completely
- [ ] Tasks maintain position for proper ordering

## 📚 Resources

- [Drag and Drop REST Pattern](https://www.atlassian.com/blog/archives/drag-and-drop-with-rest)
- [Task Management Best Practices](https://www.atlassian.com/agile)
- [Kanban Fundamentals](https://www.atlassian.com/agile/kanban)
