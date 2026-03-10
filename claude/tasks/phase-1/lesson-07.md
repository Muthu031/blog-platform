# Lesson 7: Comments & Activity Logs

## 🎯 Goal
Implement comment system with nested replies and activity tracking for audit trails.

## 📚 What You'll Learn
- Create comment endpoints
- Implement nested/threaded comments
- Add activity log tracking
- Create activity feed endpoints
- Implement mention notifications

## 📋 Prerequisites
- Completed Lessons 1-6
- Task system working
- Comment and ActivityLog models in schema

## 🛠️ Tasks

### 1. Create Comment Service

Create `backend/src/modules/comments/comment.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class CommentService {
  constructor(private prisma: PrismaClient) {}

  async createComment(userId: string, data: {
    content: string;
    taskId: string;
    parentCommentId?: string;
  }) {
    return this.prisma.comment.create({
      data: {
        content: data.content,
        taskId: data.taskId,
        authorId: userId,
        parentCommentId: data.parentCommentId
      },
      include: {
        author: true,
        replies: {
          include: { author: true }
        }
      }
    });
  }

  async getTaskComments(taskId: string) {
    return this.prisma.comment.findMany({
      where: {
        taskId,
        parentCommentId: null // Only top-level comments
      },
      include: {
        author: true,
        replies: {
          include: { author: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateComment(commentId: string, content: string) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date()
      },
      include: {
        author: true,
        replies: { include: { author: true } }
      }
    });
  }

  async deleteComment(commentId: string) {
    // Delete replies first
    await this.prisma.comment.deleteMany({
      where: { parentCommentId: commentId }
    });

    return this.prisma.comment.delete({
      where: { id: commentId }
    });
  }

  async getReplies(commentId: string) {
    return this.prisma.comment.findMany({
      where: { parentCommentId: commentId },
      include: { author: true },
      orderBy: { createdAt: 'asc' }
    });
  }
}
```

### 2. Create Comment Controller

Create `backend/src/modules/comments/comment.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { CommentService } from './comment.service';

const router = Router({ mergeParams: true });
const commentService = new CommentService(prisma);

// POST /api/tasks/:taskId/comments - Create comment
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { content, parentCommentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const comment = await commentService.createComment(req.user.id, {
      content,
      taskId: req.params.taskId,
      parentCommentId
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: parentCommentId ? 'reply_added' : 'comment_added',
        entityType: 'task',
        entityId: req.params.taskId,
        userId: req.user.id,
        changes: { comment: content }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/comments - Get task comments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const comments = await commentService.getTaskComments(req.params.taskId);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:taskId/comments/:commentId - Update comment
router.put('/:commentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const comment = await commentService.updateComment(req.params.commentId, content);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'comment_updated',
        entityType: 'task',
        entityId: req.params.taskId,
        userId: req.user.id,
        changes: { comment: content }
      }
    });

    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:taskId/comments/:commentId - Delete comment
router.delete('/:commentId', authenticate, async (req: Request, res: Response) => {
  try {
    await commentService.deleteComment(req.params.commentId);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'comment_deleted',
        entityType: 'task',
        entityId: req.params.taskId,
        userId: req.user.id
      }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/comments/:commentId/replies - Get comment replies
router.get('/:commentId/replies', authenticate, async (req: Request, res: Response) => {
  try {
    const replies = await commentService.getReplies(req.params.commentId);
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Create Activity Log Service

Create `backend/src/modules/activities/activity.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class ActivityService {
  constructor(private prisma: PrismaClient) {}

  async logActivity(data: {
    action: string;
    entityType: 'task' | 'project' | 'organization' | 'board';
    entityId: string;
    userId: string;
    changes?: any;
  }) {
    return this.prisma.activityLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        changes: data.changes
      },
      include: { user: true }
    });
  }

  async getActivityLog(entityType: string, entityId: string, limit: number = 50) {
    return this.prisma.activityLog.findMany({
      where: {
        entityType: entityType as any,
        entityId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getUserActivityFeed(userId: string, organizationId: string, limit: number = 100) {
    // Get all user's organizations and projects
    return this.prisma.activityLog.findMany({
      where: {
        OR: [
          { userId },
          // Recent activity in user's organizations
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async getProjectActivityFeed(projectId: string, limit: number = 100) {
    return this.prisma.activityLog.findMany({
      where: {
        entityId: {
          in: [
            projectId,
            // All boards in project
            // All tasks in project
          ]
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
```

### 4. Create Activity Log Controller

Create `backend/src/modules/activities/activity.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { ActivityService } from './activity.service';

const router = Router({ mergeParams: true });
const activityService = new ActivityService(prisma);

// GET /api/tasks/:taskId/activity - Get task activity log
router.get('/api/tasks/:taskId/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const activity = await activityService.getActivityLog('task', req.params.taskId);
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/activity - Get project activity feed
router.get('/api/projects/:projectId/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const activity = await activityService.getProjectActivityFeed(
      req.params.projectId,
      parseInt(limit as string)
    );
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/feed - Get user's activity feed
router.get('/api/organizations/:orgId/feed', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const activity = await activityService.getUserActivityFeed(
      req.user.id,
      req.params.orgId,
      parseInt(limit as string)
    );
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 5. Logging Activities in Other Modules

Update task service to log activities:

```typescript
// In task.service.ts, after creating a task:
await prisma.activityLog.create({
  data: {
    action: 'task_created',
    entityType: 'task',
    entityId: task.id,
    userId,
    changes: { title: data.title }
  }
});
```

## ✅ Verification Checklist

- [ ] Comments can be created on tasks
- [ ] Nested replies can be added to comments
- [ ] GET returns comments with replies nested
- [ ] Comments can be edited and updated timestamp shows
- [ ] Comments can be deleted (with cascading deletes)
- [ ] Activity logs track comment creation
- [ ] Activity logs track task changes
- [ ] Activity feed returns recent activities
- [ ] Activity logs include user information
- [ ] Comments show author details

## 📚 Resources

- [Nested Comments Pattern](https://www.prisma.io/docs/guides/database/seed-database)
- [Activity Logging Best Practices](https://www.splunk.com/en_us/blog/learning-series/what-is-logging.html)
- [Audit Trail Implementation](https://en.wikipedia.org/wiki/Audit_trail)
