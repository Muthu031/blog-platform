# Lesson 1: Socket.io Setup

## 🎯 Goal
Set up Socket.io infrastructure for real-time bidirectional communication between server and clients.

## 📚 What You'll Learn
- Install and configure Socket.io
- Set up WebSocket server alongside Express
- Implement connection handling
- Create namespace architecture
- Implement authentication for WebSocket

## 📋 Prerequisites
- Completed Phase 1 & 2
- Express server running
- Basic WebSocket understanding

## 🛠️ Tasks

### 1. Install Socket.io Dependencies

```bash
cd backend
npm install socket.io socket.io-client
npm install -D @types/socket.io
```

### 2. Create Socket.io Server Instance

Create `backend/src/websocket/socket.ts`:

```typescript
import { Server, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { Express } from 'express';
import jwt from 'jsonwebtoken';

export class WebSocketServer {
  private io: Server;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupConnections();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        socket.data.userId = decoded.sub;
        socket.data.email = decoded.email;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupConnections() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Track connected users
      this.connectedUsers.set(userId, socket.id);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Emit user online status
      this.io.emit('user:online', { userId, socketId: socket.id });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
        this.connectedUsers.delete(userId);
        
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
        }

        this.io.emit('user:offline', { userId });
      });

      socket.on('error', (error) => {
        console.error(`Socket error for user ${userId}:`, error);
      });
    });
  }

  /**
   * Get Socket.io instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Get user's socket IDs
   */
  getUserSockets(userId: string): string[] {
    return Array.from(this.userSockets.get(userId) || []);
  }

  /**
   * Emit to specific user
   */
  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.getUserSockets(userId);
    sockets.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });
  }

  /**
   * Emit to multiple users
   */
  emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }

  /**
   * Emit to all connected users
   */
  broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
}

export let wsServer: WebSocketServer;

export const initializeWebSocket = (httpServer: HTTPServer) => {
  wsServer = new WebSocketServer(httpServer);
  return wsServer;
};
```

### 3. Update Main Server File

Update or create `backend/src/server.ts`:

```typescript
import express, { Express } from 'express';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket/socket';

const app: Express = express();
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Express middleware and routes
app.use(express.json());
// ... other middleware

// Routes
app.use('/api', require('./routes'));

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});
```

### 4. Create Namespace for Organizations

Create `backend/src/websocket/namespaces/organization.ts`:

```typescript
import { Server, Socket } from 'socket.io';
import { wsServer } from '../socket';

export const setupOrganizationNamespace = (io: Server) => {
  const orgNamespace = io.of('/organizations');

  orgNamespace.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    console.log(`User ${userId} connected to /organizations namespace`);

    // Join organization room
    socket.on('org:join', (organizationId: string) => {
      socket.join(`org:${organizationId}`);
      console.log(`User ${userId} joined org room: org:${organizationId}`);
    });

    // Leave organization room
    socket.on('org:leave', (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
    });

    // Handle position updates (for presence)
    socket.on('org:presence', (organizationId: string, data: any) => {
      socket.to(`org:${organizationId}`).emit('org:presence', {
        userId,
        ...data
      });
    });
  });

  return orgNamespace;
};
```

### 5. Create Namespace for Projects

Create `backend/src/websocket/namespaces/project.ts`:

```typescript
import { Server, Socket } from 'socket.io';

export const setupProjectNamespace = (io: Server) => {
  const projectNamespace = io.of('/projects');

  projectNamespace.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;

    console.log(`User ${userId} connected to /projects namespace`);

    // Join project room
    socket.on('project:join', (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${userId} joined project room: project:${projectId}`);
    });

    // Leave project room
    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from /projects namespace`);
    });
  });

  return projectNamespace;
};
```

### 6. Initialize Namespaces

Update `backend/src/websocket/socket.ts` to include namespaces:

```typescript
export class WebSocketServer {
  // ... existing code

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupConnections();
    
    // Setup namespaces
    setupOrganizationNamespace(this.io);
    setupProjectNamespace(this.io);
  }

  // ... rest of code
}
```

### 7. Create Frontend Socket Client

Create `frontend/src/services/socket.ts`:

```typescript
import io, { Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private organizationSocket: Socket | null = null;
  private projectSocket: Socket | null = null;

  connect(token: string) {
    this.socket = io('http://localhost:3001', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  connectToOrganization(organizationId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.organizationSocket = this.socket.io.socket('/organizations');
    this.organizationSocket.connect();
    this.organizationSocket.emit('org:join', organizationId);
  }

  connectToProject(projectId: string) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.projectSocket = this.socket.io.socket('/projects');
    this.projectSocket.connect();
    this.projectSocket.emit('project:join', projectId);
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const socketClient = new SocketClient();
```

## ✅ Verification Checklist

- [ ] Socket.io package installed and configured
- [ ] WebSocket server initializes with Express HTTP server
- [ ] Authentication middleware validates JWT tokens
- [ ] Users can connect to main namespace
- [ ] User online/offline events are broadcast
- [ ] Organization namespace handles joins
- [ ] Project namespace handles joins
- [ ] Socket rooms are created per organization
- [ ] Frontend client can connect with auth token
- [ ] Connection/disconnection logs appear

## 📚 Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Socket.io Authentication](https://socket.io/docs/v4/middlewares/#Sending-credentials)
- [Namespaces and Rooms](https://socket.io/docs/v4/namespaces/)
- [Socket Events Best Practices](https://socket.io/docs/v4/emit-cheatsheet/)
