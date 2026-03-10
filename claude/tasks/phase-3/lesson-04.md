# Lesson 4: Notification System

## 🎯 Goal
Implement a comprehensive notification system for task mentions, assignments, and activity updates.

## 📚 What You'll Learn
- Create notification database models
- Implement mention system with @ tags
- Build notification delivery service
- Create notification preferences

## 📋 Prerequisites
- Completed Phase 3 Lessons 1-3
- Real-time events working
- Task and comment systems ready

## 🛠️ Tasks

### 1. Create Notification Service

Create `backend/src/modules/notifications/notification.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { wsServer } from '../../websocket/socket';

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create notification for user
   */
  async createNotification(userId: string, data: {
    type: 'mention' | 'task_assigned' | 'task_updated' | 'comment_reply' | 'task_completed';
    title: string;
    message: string;
    relatedUserId?: string;
    taskId?: string;
    commentId?: string;
    organizationId: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedUserId: data.relatedUserId,
        taskId: data.taskId,
        commentId: data.commentId,
        organizationId: data.organizationId,
        read: false
      },
      include: {
        relatedUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Send real-time notification
    wsServer.emitToUser(userId, 'notification:new', notification);

    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async notifyUsers(userIds: string[], data: any) {
    const notifications = await Promise.all(
      userIds.map(userId => this.createNotification(userId, data))
    );
    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      include: {
        relatedUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false }
    });
  }

  /**
   * Extract and parse mentions from text
   */
  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex) || [];
    return matches.map(m => m.substring(1)); // Remove @ symbol
  }

  /**
   * Notify mentioned users
   */
  async notifyMentions(
    text: string,
    authorId: string,
    taskId: string,
    organizationId: string
  ) {
    const mentions = this.extractMentions(text);

    for (const mention of mentions) {
      const user = await this.prisma.user.findUnique({
        where: { email: mention }
      });

      if (user && user.id !== authorId) {
        await this.createNotification(user.id, {
          type: 'mention',
          title: 'You were mentioned',
          message: `You were mentioned in a comment`,
          relatedUserId: authorId,
          taskId,
          organizationId
        });
      }
    }
  }
}
```

### 2. Create Notification Controller

Create `backend/src/modules/notifications/notification.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { NotificationService } from './notification.service';

const router = Router();
const notificationService = new NotificationService(prisma);

// GET /api/notifications - Get user notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const notifications = await notificationService.getUserNotifications(
      req.user.id,
      parseInt(limit as string)
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/unread/count - Get unread count
router.get('/unread/count', authenticate, async (req: Request, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Integrate Notifications with Comments

Update comment creation to support mentions:

```typescript
// In comment.controller.ts
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { content, parentCommentId } = req.body;

    const comment = await commentService.createComment(req.user.id, {
      content,
      taskId: req.params.taskId,
      parentCommentId
    });

    // Check for mentions
    await notificationService.notifyMentions(
      content,
      req.user.id,
      req.params.taskId,
      req.user.organizationId
    );

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Create Frontend Notification Component

Create `frontend/src/hooks/useNotifications.ts`:

```typescript
import { useState, useEffect } from 'react';
import { socketClient } from '../services/socket';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Listen for new notifications
    socketClient.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socketClient.socket?.off('notification:new');
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
};
```

## ✅ Verification Checklist

- [ ] Notifications are created and stored in database
- [ ] Real-time notifications broadcast to users
- [ ] Mention extraction works with @ symbol
- [ ] Mentioned users receive notifications
- [ ] Notifications can be marked as read
- [ ] Unread count is accurate
- [ ] Notification includes related user info
- [ ] Notifications persist across sessions
- [ ] Frontend receives real-time notifications
- [ ] Notification types are properly categorized

## 📚 Resources

- [Notification Patterns](https://www.ably.io/topic/notifications)
- [Mention System Implementation](https://medium.com/@jordanknott/using-markdown-and-mentions-a0e57f6e7e4)
- [Push Notification Architecture](https://firebase.google.com/docs/cloud-messaging)
