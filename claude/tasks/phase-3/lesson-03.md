# Lesson 3: Presence Tracking

## 🎯 Goal
Implement real-time presence tracking to show which team members are currently online and viewing specific pages.

## 📚 What You'll Learn
- Track user presence in projects
- Show active users viewing boards
- Implement cursor position tracking
- Handle presence timeouts

## 📋 Prerequisites
- Completed Phase 3 Lessons 1-2
- Real-time events working
- WebSocket namespaces established

## 🛠️ Tasks

### 1. Create Presence Service

Create `backend/src/websocket/services/presence.ts`:

```typescript
import { Server, Socket } from 'socket.io';

export interface UserPresence {
  userId: string;
  socketId: string;
  name: string;
  email: string;
  color: string;
  lastActive: Date;
  cursorX?: number;
  cursorY?: number;
  viewing?: 'board' | 'backlog' | 'settings';
}

export class PresenceService {
  private presenceMap: Map<string, Map<string, UserPresence>> = new Map(); // room -> userId -> presence
  private presenceTimeout: Map<string, NodeJS.Timeout> = new Map();

  constructor(private io: Server) {}

  /**
   * Add user to presence tracking
   */
  addUserPresence(room: string, userId: string, socketId: string, userInfo: any) {
    if (!this.presenceMap.has(room)) {
      this.presenceMap.set(room, new Map());
    }

    const presence: UserPresence = {
      userId,
      socketId,
      name: userInfo.name,
      email: userInfo.email,
      color: this.generateUserColor(userId),
      lastActive: new Date(),
      viewing: 'board'
    };

    this.presenceMap.get(room)!.set(userId, presence);

    // Broadcast presence update
    this.broadcastPresenceList(room);

    // Clear existing timeout
    this.clearPresenceTimeout(userId);
  }

  /**
   * Remove user from presence tracking
   */
  removeUserPresence(room: string, userId: string) {
    const roomPresence = this.presenceMap.get(room);
    if (roomPresence) {
      roomPresence.delete(userId);

      if (roomPresence.size === 0) {
        this.presenceMap.delete(room);
      }

      this.broadcastPresenceList(room);
    }
  }

  /**
   * Update user cursor position
   */
  updateCursorPosition(room: string, userId: string, x: number, y: number) {
    const roomPresence = this.presenceMap.get(room);
    if (roomPresence && roomPresence.has(userId)) {
      const presence = roomPresence.get(userId)!;
      presence.cursorX = x;
      presence.cursorY = y;
      presence.lastActive = new Date();

      // Broadcast cursor position to others
      this.io.to(room).emit('presence:cursor', {
        userId,
        x,
        y,
        color: presence.color
      });
    }
  }

  /**
   * Update viewing context
   */
  updateViewingContext(room: string, userId: string, viewing: 'board' | 'backlog' | 'settings') {
    const roomPresence = this.presenceMap.get(room);
    if (roomPresence && roomPresence.has(userId)) {
      roomPresence.get(userId)!.viewing = viewing;
      this.broadcastPresenceList(room);
    }
  }

  /**
   * Get all users in a room
   */
  getRoomPresence(room: string): UserPresence[] {
    const roomPresence = this.presenceMap.get(room);
    return roomPresence ? Array.from(roomPresence.values()) : [];
  }

  /**
   * Broadcast presence list to room
   */
  private broadcastPresenceList(room: string) {
    const presence = this.getRoomPresence(room);
    this.io.to(room).emit('presence:list', presence);
  }

  /**
   * Set presence timeout (mark inactive after 30 seconds)
   */
  private clearPresenceTimeout(userId: string) {
    const timeout = this.presenceTimeout.get(userId);
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  /**
   * Generate consistent color for user
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1',
      '#FFA07A', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E2', '#F8B88B'
    ];

    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    return colors[hash % colors.length];
  }
}
```

### 2. Create Presence Namespace

Create `backend/src/websocket/namespaces/presence.ts`:

```typescript
import { Server, Socket } from 'socket.io';
import { PresenceService } from '../services/presence';

export const setupPresenceNamespace = (io: Server) => {
  const presenceService = new PresenceService(io);
  const presenceNamespace = io.of('/presence');

  presenceNamespace.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    // Join board room
    socket.on('presence:join', (projectId: string, boardId: string) => {
      const room = `project:${projectId}:board:${boardId}`;
      socket.join(room);

      presenceService.addUserPresence(room, userId, socket.id, {
        name: socket.data.name,
        email: socket.data.email
      });

      console.log(`User ${userId} joined presence tracking for ${room}`);
    });

    // Leave board room
    socket.on('presence:leave', (projectId: string, boardId: string) => {
      const room = `project:${projectId}:board:${boardId}`;
      socket.leave(room);
      presenceService.removeUserPresence(room, userId);
    });

    // Update cursor position
    socket.on('presence:cursor', (projectId: string, boardId: string, x: number, y: number) => {
      const room = `project:${projectId}:board:${boardId}`;
      presenceService.updateCursorPosition(room, userId, x, number);
    });

    // Update viewing context
    socket.on('presence:viewing', (projectId: string, boardId: string, view: string) => {
      const room = `project:${projectId}:board:${boardId}`;
      presenceService.updateViewingContext(room, userId, view as any);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Clean up all rooms for this user
      socket.rooms.forEach(room => {
        presenceService.removeUserPresence(room, userId);
      });
    });
  });

  return presenceNamespace;
};
```

### 3. Create Frontend Presence Hook

Create `frontend/src/hooks/usePresence.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { socketClient } from '../services/socket';

interface UserPresence {
  userId: string;
  name: string;
  email: string;
  color: string;
  viewing: string;
  cursorX?: number;
  cursorY?: number;
}

export const usePresence = (projectId: string, boardId: string) => {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    // Join presence tracking
    socketClient.emit('presence:join', projectId, boardId);

    // Listen for presence updates
    socketClient.on('presence:list', (presenceList: UserPresence[]) => {
      setUsers(presenceList);
    });

    // Listen for cursor updates
    socketClient.on('presence:cursor', (data: { userId: string; x: number; y: number }) => {
      setCursors(prev => new Map(prev).set(data.userId, { x: data.x, y: data.y }));
    });

    return () => {
      socketClient.emit('presence:leave', projectId, boardId);
      socketClient.socket?.off('presence:list');
      socketClient.socket?.off('presence:cursor');
    };
  }, [projectId, boardId]);

  const updateCursorPosition = useCallback((x: number, y: number) => {
    socketClient.emit('presence:cursor', projectId, boardId, x, y);
  }, [projectId, boardId]);

  const updateViewingContext = useCallback((view: 'board' | 'backlog' | 'settings') => {
    socketClient.emit('presence:viewing', projectId, boardId, view);
  }, [projectId, boardId]);

  return {
    users,
    cursors,
    updateCursorPosition,
    updateViewingContext
  };
};
```

### 4. Create Avatar Indicators Component

Create `frontend/src/components/PresenceAvatars.tsx`:

```typescript
import React from 'react';
import styled from 'styled-components';

interface UserPresence {
  userId: string;
  name: string;
  color: string;
}

interface PresenceAvatarsProps {
  users: UserPresence[];
}

const AvatarContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Avatar = styled.div<{ color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ users }) => {
  return (
    <AvatarContainer>
      {users.map(user => (
        <Avatar key={user.userId} color={user.color} title={user.name}>
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
      ))}
    </AvatarContainer>
  );
};
```

## ✅ Verification Checklist

- [ ] Users joining a board appear in presence list
- [ ] User avatars display with consistent colors
- [ ] Cursor positions broadcast in real-time
- [ ] Presence list updates when users join/leave
- [ ] Viewing context tracks which view user is in
- [ ] Presence data includes user information
- [ ] Timeouts remove inactive users
- [ ] Frontend receives presence updates
- [ ] Avatar component displays correctly
- [ ] Cleanup happens on disconnect

## 📚 Resources

- [Presence Patterns](https://www.ably.io/topic/presence)
- [Real-time Collaboration](https://medium.com/async-actual/collaborative-editing-in-real-time-9b9f00c27dc3)
- [User Activity Tracking](https://www.mongodb.com/basics/activity-tracking)
