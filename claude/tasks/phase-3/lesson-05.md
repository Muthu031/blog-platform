# Lesson 5: Frontend Real-Time Integration

## 🎯 Goal
Build frontend components that integrate real-time updates from WebSocket events.

## 📚 What You'll Learn
- Connect frontend to WebSocket server
- Handle real-time task updates in UI
- Implement optimistic updates
- Display presence indicators
- Show real-time notifications

## 📋 Prerequisites
- Completed Phase 3 Lessons 1-4
- React application setup
- Socket.io client installed

## 🛠️ Tasks

### 1. Create Context for Real-Time Data

Create `frontend/src/context/RealtimeContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketClient } from '../services/socket';

interface RealtimeContextType {
  isConnected: boolean;
  tasks: Map<string, any>;
  users: any[];
  notifications: any[];
  updateTask: (taskId: string, task: any) => void;
  removeTask: (taskId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState<Map<string, any>>(new Map());
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Connect to WebSocket
    const token = localStorage.getItem('token');
    if (token) {
      socketClient.connect(token);
    }

    socketClient.on('connect', () => {
      setIsConnected(true);
    });

    socketClient.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for task events
    socketClient.on('task:created', (data) => {
      setTasks(prev => new Map(prev).set(data.task.id, data.task));
    });

    socketClient.on('task:updated', (data) => {
      setTasks(prev => {
        const updatedTask = {
          ...prev.get(data.taskId),
          ...data.changes
        };
        return new Map(prev).set(data.taskId, updatedTask);
      });
    });

    socketClient.on('task:deleted', (data) => {
      setTasks(prev => {
        const newTasks = new Map(prev);
        newTasks.delete(data.taskId);
        return newTasks;
      });
    });

    // Listen for presence
    socketClient.on('presence:list', (userList) => {
      setUsers(userList);
    });

    // Listen for notifications
    socketClient.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      socketClient.socket?.off('connect');
      socketClient.socket?.off('disconnect');
      socketClient.socket?.off('task:created');
      socketClient.socket?.off('task:updated');
      socketClient.socket?.off('task:deleted');
      socketClient.socket?.off('presence:list');
      socketClient.socket?.off('notification:new');
    };
  }, []);

  const updateTask = (taskId: string, task: any) => {
    setTasks(prev => new Map(prev).set(taskId, task));
  };

  const removeTask = (taskId: string) => {
    setTasks(prev => {
      const newTasks = new Map(prev);
      newTasks.delete(taskId);
      return newTasks;
    });
  };

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      tasks,
      users,
      notifications,
      updateTask,
      removeTask
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};
```

### 2. Create Task Board Component with Real-Time Updates

Create `frontend/src/components/TaskBoard.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRealtime } from '../context/RealtimeContext';
import { socketClient } from '../services/socket';

interface TaskBoardProps {
  projectId: string;
  boardId: string;
}

const BoardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 20px;
`;

const Column = styled.div`
  background: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  min-height: 600px;
`;

const ColumnTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #333;
`;

const TaskCard = styled.div<{ isDragging?: boolean }>`
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: move;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  opacity: ${props => props.isDragging ? 0.5 : 1};
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const TaskTitle = styled.div`
  font-weight: 500;
  margin-bottom: 8px;
`;

const TaskMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
`;

export const TaskBoard: React.FC<TaskBoardProps> = ({ projectId, boardId }) => {
  const { isConnected, tasks } = useRealtime();
  const [columns, setColumns] = useState<any[]>([]);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial board data
    fetchBoardData();

    // Join project room
    socketClient.emit('project:join', projectId);

    return () => {
      socketClient.emit('project:leave', projectId);
    };
  }, [projectId]);

  const fetchBoardData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/boards`);
      const boards = await response.json();
      const board = boards.find(b => b.id === boardId);
      setColumns(board.columns || []);
    } catch (error) {
      console.error('Error fetching board:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    // Optimistic update
    const task = tasks.get(draggedTask);
    if (task) {
      socketClient.emit('task:move', {
        projectId,
        taskId: draggedTask,
        columnId,
        position: 0
      });
    }

    setDraggedTask(null);
  };

  return (
    <BoardContainer>
      {columns.map(column => (
        <Column key={column.id}>
          <ColumnTitle>{column.name}</ColumnTitle>
          <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)}>
            {column.tasks?.map((task: any) => (
              <TaskCard
                key={task.id}
                draggable
                isDragging={draggedTask === task.id}
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <TaskTitle>#{task.taskNumber} {task.title}</TaskTitle>
                <TaskMeta>
                  <span>{task.status}</span>
                  {task.assignee && <span>@{task.assignee.name}</span>}
                </TaskMeta>
              </TaskCard>
            ))}
          </div>
        </Column>
      ))}
    </BoardContainer>
  );
};
```

### 3. Create Notification Bell Component

Create `frontend/src/components/NotificationBell.tsx`:

```typescript
import React, { useState } from 'react';
import styled from 'styled-components';
import { useNotifications } from '../hooks/useNotifications';

const BellContainer = styled.div`
  position: relative;
`;

const BellIcon = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  position: relative;

  &:hover {
    color: #007bff;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
`;

const NotificationDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 300px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
`;

const NotificationItem = styled.div<{ read: boolean }>`
  padding: 12px;
  border-bottom: 1px solid #eee;
  background: ${props => props.read ? '#fff' : '#f0f8ff'};
  cursor: pointer;

  &:hover {
    background: #f5f5f5;
  }
`;

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BellContainer>
      <BellIcon onClick={() => setIsOpen(!isOpen)}>
        🔔
        {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
      </BellIcon>

      {isOpen && (
        <NotificationDropdown>
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              read={notification.read}
              onClick={() => markAsRead(notification.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{notification.title}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {notification.message}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {new Date(notification.createdAt).toLocaleDateString()}
              </div>
            </NotificationItem>
          ))}
        </NotificationDropdown>
      )}
    </BellContainer>
  );
};
```

### 4. Add Components to Main App

Update `frontend/src/App.tsx`:

```typescript
import React from 'react';
import { RealtimeProvider } from './context/RealtimeContext';
import { TaskBoard } from './components/TaskBoard';
import { NotificationBell } from './components/NotificationBell';
import { PresenceAvatars } from './components/PresenceAvatars';

function App() {
  return (
    <RealtimeProvider>
      <div className="app">
        <header>
          <h1>Project Management</h1>
          <NotificationBell />
        </header>

        <main>
          <TaskBoard projectId="proj-1" boardId="board-1" />
        </main>
      </div>
    </RealtimeProvider>
  );
}

export default App;
```

## ✅ Verification Checklist

- [ ] Frontend connects to WebSocket server
- [ ] Real-time task updates appear immediately
- [ ] Drag & drop moves sync across browsers
- [ ] Presence avatars display
- [ ] Notifications appear in real-time
- [ ] Notification bell shows unread count
- [ ] Optimistic updates feel instantaneous
- [ ] Context provides real-time data
- [ ] All event listeners are properly cleaned up
- [ ] Frontend gracefully handles disconnections

## 📚 Resources

- [React Context API](https://react.dev/reference/react/useContext)
- [React Hooks Patterns](https://react.dev/reference/react)
- [State Management Best Practices](https://kentcdodds.com/blog/application-state-management-with-react-hooks)
