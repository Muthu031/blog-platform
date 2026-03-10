# Lesson 2: Real-Time Task Updates

## 🎯 Goal
Implement real-time synchronization of task changes across all connected team members.

## 📚 What You'll Learn
- Emit task updates to connected clients
- Broadcast task changes to appropriate users
- Implement conflict-free concurrent updates
- Track task state changes

## 📋 Prerequisites
- Completed Phase 3 Lesson 1
- Socket.io namespaces working
- Task CRUD endpoints ready

## 🛠️ Tasks

### 1. Create Task Events Service

Create `backend/src/websocket/events/taskEvents.ts`:

```typescript
import { Server, Socket } from 'socket.io';
import { wsServer } from '../socket';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TaskEventsService {
  constructor(private io: Server) {}

  /**
   * Broadcast task creation to project members
   */
  async broadcastTaskCreated(projectId: string, task: any) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: { members: true }
        }
      }
    });

    if (!project) return;

    const memberIds = project.organization.members.map(m => m.userId);
    const room = `project:${projectId}`;

    this.io.to(room).emit('task:created', {
      task,
      timestamp: new Date(),
      projectId
    });
  }

  /**
   * Broadcast task update to project members
   */
  async broadcastTaskUpdated(projectId: string, taskId: string, changes: any) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) return;

    const room = `project:${projectId}`;

    this.io.to(room).emit('task:updated', {
      taskId,
      changes,
      task,
      timestamp: new Date(),
      projectId
    });
  }

  /**
   * Broadcast task move (drag & drop)
   */
  async broadcastTaskMoved(projectId: string, taskId: string, columnId: string, position: number) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) return;

    const room = `project:${projectId}`;

    this.io.to(room).emit('task:moved', {
      taskId,
      columnId,
      position,
      task,
      timestamp: new Date(),
      projectId
    });
  }

  /**
   * Broadcast task deletion
   */
  async broadcastTaskDeleted(projectId: string, taskId: string) {
    const room = `project:${projectId}`;

    this.io.to(room).emit('task:deleted', {
      taskId,
      timestamp: new Date(),
      projectId
    });
  }

  /**
   * Broadcast task assignment
   */
  async broadcastTaskAssigned(projectId: string, taskId: string, assigneeId: string, unassign: boolean = false) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true }
    });

    if (!task) return;

    const room = `project:${projectId}`;
    const action = unassign ? 'task:unassigned' : 'task:assigned';

    this.io.to(room).emit(action, {
      taskId,
      assigneeId,
      assignee: task.assignee,
      timestamp: new Date(),
      projectId
    });
  }
}
```

### 2. Update Task Controller with Events

Update `backend/src/modules/tasks/task.controller.ts`:

```typescript
import { TaskEventsService } from '../../websocket/events/taskEvents';
import { wsServer } from '../../websocket/socket';

const taskEventsService = new TaskEventsService(wsServer.getIO());

// POST /api/projects/:projectId/columns/:columnId/tasks
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, assigneeId } = req.body;

    const task = await taskService.createTask(
      req.params.columnId,
      req.params.projectId,
      { title, description, assigneeId }
    );

    // Emit real-time event
    await taskEventsService.broadcastTaskCreated(req.params.projectId, task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, description, assigneeId } = req.body;
    const changes = { title, description, assigneeId };

    const task = await taskService.updateTask(req.params.taskId, changes);

    // Emit real-time event
    await taskEventsService.broadcastTaskUpdated(req.params.projectId, req.params.taskId, changes);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId/move
router.patch('/:taskId/move', authenticate, async (req: Request, res: Response) => {
  try {
    const { columnId, position } = req.body;

    const task = await taskService.moveTask(req.params.taskId, columnId, position);

    // Emit real-time event
    await taskEventsService.broadcastTaskMoved(
      req.params.projectId,
      req.params.taskId,
      columnId,
      position
    );

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId/assign
router.patch('/:taskId/assign', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const task = await taskService.assignTask(req.params.taskId, userId);

    // Emit real-time event
    await taskEventsService.broadcastTaskAssigned(req.params.projectId, req.params.taskId, userId);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/tasks/:taskId/unassign
router.patch('/:taskId/unassign', authenticate, async (req: Request, res: Response) => {
  try {
    const task = await taskService.unassignTask(req.params.taskId);

    // Emit real-time event
    await taskEventsService.broadcastTaskAssigned(req.params.projectId, req.params.taskId, null, true);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, async (req: Request, res: Response) => {
  try {
    await taskService.deleteTask(req.params.taskId);

    // Emit real-time event
    await taskEventsService.broadcastTaskDeleted(req.params.projectId, req.params.taskId);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Create Frontend Task Update Handler

Create `frontend/src/hooks/useTaskUpdates.ts`:

```typescript
import { useEffect, useCallback } from 'react';
import { socketClient } from '../services/socket';

export const useTaskUpdates = (projectId: string, onUpdate: (event: string, data: any) => void) => {
  useEffect(() => {
    // Listen for task events
    const events = [
      'task:created',
      'task:updated',
      'task:moved',
      'task:deleted',
      'task:assigned',
      'task:unassigned'
    ];

    events.forEach(event => {
      socketClient.on(event, (data) => {
        if (data.projectId === projectId) {
          onUpdate(event, data);
        }
      });
    });

    return () => {
      // Cleanup listeners
      events.forEach(event => {
        socketClient.socket?.off(event);
      });
    };
  }, [projectId, onUpdate]);
};
```

### 4. Create Conflict Resolution

Create `backend/src/websocket/utils/conflictResolution.ts`:

```typescript
/**
 * Operational Transform for concurrent updates
 * Prevents conflicts when multiple users edit simultaneously
 */
export class ConflictResolver {
  /**
   * Apply transform to resolve conflicts
   */
  static resolveTaskUpdate(
    localChange: any,
    remoteChange: any,
    serverState: any
  ): any {
    // If both changes are to different fields, merge them
    if (!this.fieldsOverlap(localChange, remoteChange)) {
      return { ...localChange, ...remoteChange };
    }

    // If same field, server state wins (Last Write Wins strategy)
    return serverState;
  }

  private static fieldsOverlap(obj1: any, obj2: any): boolean {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    return keys1.some(key => keys2.includes(key));
  }

  /**
   * Generate operation ID for tracking changes
   */
  static generateOpId(userId: string, timestamp: number): string {
    return `${userId}-${timestamp}`;
  }
}
```

## ✅ Verification Checklist

- [ ] Task creation broadcasts to all project members in real-time
- [ ] Task updates appear immediately for all connected users
- [ ] Drag & drop moves sync across clients
- [ ] Task assignment broadcasts to relevant users
- [ ] Task deletion removes item from all clients
- [ ] Timestamps are accurate for all updates
- [ ] Frontend receives and processes events correctly
- [ ] Concurrent edits don't cause conflicts
- [ ] Event payload includes necessary task data
- [ ] Only relevant project members receive updates

## 📚 Resources

- [Operational Transform](https://en.wikipedia.org/wiki/Operational_transformation)
- [Real-time Synchronization Patterns](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Conflict-free Data Types](https://crdt.tech/)
