# Event-Driven Architecture - Building Reactive Systems

> Decouple services and build scalable, real-time systems using events

## 1. Core Concepts

### Synchronous vs Asynchronous

```
Synchronous (Blocking):
User creates task → API waits for ALL operations → Returns response
├─ Save task to DB (100ms)
├─ Send notification (200ms)  
├─ Update activity log (50ms)
└─ Generate report (1000ms) ← Slowest operation blocks everything
Total time: ~1.35 seconds (User waits!)

Asynchronous (Event-Driven):
User creates task → API saves task → Returns immediately (10ms)
                    ↓
            Event published: "TaskCreated"
                    ├→ Worker 1: Send notification (200ms) [Async]
                    ├→ Worker 2: Update activity log (50ms) [Async]
                    └→ Worker 3: Generate report (1000ms) [Async]
Total time: ~10ms (User gets response instantly!)
```

## 2. Real-World Applications

### Example 1: Task Creation Event Flow

```typescript
class EventDrivenTaskService {
  constructor(
    private db: PrismaClient,
    private eventBus: EventBus,
    private redis: Redis
  ) {}
  
  async createTask(organizationId: string, data: CreateTaskData): Promise<Task> {
    // 1. Create task synchronously (fast path)
    const task = await this.db.task.create({
      data: {
        ...data,
        organizationId,
        status: 'todo',
        createdAt: new Date()
      }
    });
    
    // 2. Publish event (non-blocking, immediately returns)
    await this.eventBus.publish({
      type: 'TaskCreated',
      organizationId,
      taskId: task.id,
      data: task,
      timestamp: new Date()
    });
    
    // 3. Cache for real-time updates
    await this.redis.lpush(`org:${organizationId}:recent_tasks`, JSON.stringify(task));
    
    // Return to user quickly!
    return task;
  }
}

// Event subscribers (run asynchronously)
class NotificationEventHandler {
  async handle(event: TaskCreatedEvent): Promise<void> {
    const task = event.data;
    const assignee = await db.user.findUnique({ where: { id: task.assigneeId } });
    
    // Send email (slow operation, doesn't block task creation)
    await this.emailService.send({
      to: assignee.email,
      subject: `New task: ${task.title}`,
      body: `Task was assigned to you`
    });
    
    // Send push notification (slow operation)
    await this.pushService.send(assignee.id, {
      title: 'New Task',
      body: task.title
    });
  }
}

class ActivityLogEventHandler {
  async handle(event: TaskCreatedEvent): Promise<void> {
    // Log the activity (for audit trail)
    await db.activityLog.create({
      data: {
        organizationId: event.organizationId,
        action: 'task.created',
        targetId: event.taskId,
        targetType: 'Task',
        metadata: { task: event.data },
        timestamp: event.timestamp
      }
    });
  }
}

class ReportGenerationHandler {
  async handle(event: TaskCreatedEvent): Promise<void> {
    // Generate report (very slow, but non-blocking)
    const stats = await db.task.aggregate({
      where: { organizationId: event.organizationId },
      _count: true,
      _avg: { priority: true }
    });
    
    await this.cache.set(
      `report:${event.organizationId}:task_stats`,
      JSON.stringify(stats),
      3600 // 1 hour
    );
  }
}
```

### Example 2: Event Sourcing (Complete Audit Trail)

```typescript
// Instead of storing state, store events
// You can replay events to rebuild state at any point in time

interface Event {
  id: string;
  type: string;
  organizationId: string;
  aggregateId: string; // Task ID
  timestamp: Date;
  data: any;
  version: number; // For conflict detection
}

class EventSourcingTaskService {
  async createTask(organizationId: string, data: CreateTaskData): Promise<Task> {
    const taskId = generateId();
    
    // Store event instead of final state
    const event: Event = {
      id: generateId(),
      type: 'TaskCreated',
      organizationId,
      aggregateId: taskId,
      timestamp: new Date(),
      data: {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        priority: data.priority
      },
      version: 1
    };
    
    // Append event to event store (append-only)
    await this.eventStore.append(event);
    
    // Publish to subscribers
    await this.eventBus.publish(event);
    
    return this.reconstructTaskFromEvents(taskId);
  }
  
  async updateTaskStatus(organizationId: string, taskId: string, newStatus: string): Promise<void> {
    // Get current version from event store
    const events = await this.eventStore.getEvents(taskId);
    const currentVersion = events.length;
    
    const event: Event = {
      id: generateId(),
      type: 'TaskStatusChanged',
      organizationId,
      aggregateId: taskId,
      timestamp: new Date(),
      data: { newStatus, previousStatus: events[events.length - 1].data.status },
      version: currentVersion + 1
    };
    
    await this.eventStore.append(event);
    await this.eventBus.publish(event);
  }
  
  // Rebuild task state from all events
  async reconstructTaskFromEvents(taskId: string): Promise<Task> {
    const events = await this.eventStore.getEvents(taskId);
    
    let task: Partial<Task> = { id: taskId };
    
    for (const event of events) {
      if (event.type === 'TaskCreated') {
        task = { ...task, ...event.data };
      } else if (event.type === 'TaskStatusChanged') {
        task.status = event.data.newStatus;
      } else if (event.type === 'TaskAssigneeChanged') {
        task.assigneeId = event.data.newAssigneeId;
      }
    }
    
    return task as Task;
  }
  
  // Audit trail - see all changes
  async getTaskHistory(taskId: string): Promise<Event[]> {
    return this.eventStore.getEvents(taskId);
  }
}
```

### Example 3: CQRS (Command Query Responsibility Segregation)

```typescript
// Separate read and write models
// Write model: Optimized for consistency
// Read model: Optimized for queries

// Write Model (Canonical source of truth)
class TaskWriteService {
  async createTask(data: CreateTaskData): Promise<void> {
    // Write to primary database (strong consistency)
    const task = await this.primaryDb.task.create({ data });
    
    // Publish event
    await this.eventBus.publish({
      type: 'TaskCreated',
      data: task
    });
    
    // Event handlers update read model asynchronously
  }
  
  async updateTask(taskId: string, updates: any): Promise<void> {
    // Validate and update in primary DB
    const task = await this.primaryDb.task.update({
      where: { id: taskId },
      data: updates
    });
    
    // Publish event
    await this.eventBus.publish({
      type: 'TaskUpdated',
      data: task
    });
  }
}

// Read Model (Optimized for queries)
class TaskReadService {
  async searchTasks(
    organizationId: string,
    filters: {
      status?: string;
      assignee?: string;
      priority?: number;
    }
  ): Promise<Task[]> {
    // Read from denormalized, indexed view
    // Can use Elasticsearch, Redis, or optimized DB view
    return this.readDb.query(`
      SELECT * FROM tasks_view
      WHERE org_id = $1
      ${filters.status ? 'AND status = $2' : ''}
      ${filters.assignee ? 'AND assignee_id = $3' : ''}
      ${filters.priority ? 'AND priority = $4' : ''}
    `);
  }
  
  async getTaskStats(organizationId: string): Promise<TaskStats> {
    // Read from pre-computed aggregates
    return this.cache.get(`task_stats:${organizationId}`) ||
           this.readDb.getTaskStats(organizationId);
  }
}

// Event handlers update read model
class TaskReadModelUpdater {
  async handleTaskCreated(event: TaskCreatedEvent): Promise<void> {
    // Update read model (denormalized view)
    await this.readDb.tasks_view.create({ ...event.data });
    
    // Update cached stats
    await this.cache.increment(`task_stats:${event.organizationId}:total_count`);
  }
  
  async handleTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    await this.readDb.tasks_view.update({
      where: { id: event.data.id },
      data: event.data
    });
  }
}
```

### Example 4: Real-Time Updates with WebSockets

```typescript
class RealTimeEventService {
  private wsConnections = new Map<string, WebSocket>();
  
  async initialize(): Promise<void> {
    // When user opens WebSocket connection
    this.wss.on('connection', (ws: WebSocket, req: Request) => {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;
      
      this.wsConnections.set(userId, ws);
      
      // Send real-time events to user
      this.eventBus.on('TaskCreated', (event) => {
        // Only send if user is in same organization
        if (event.organizationId === organizationId) {
          ws.send(JSON.stringify({
            type: 'TaskCreated',
            data: event.data
          }));
        }
      });
      
      ws.on('close', () => {
        this.wsConnections.delete(userId);
      });
    });
  }
  
  async publishTaskUpdate(organizationId: string, task: Task): Promise<void> {
    // Notify all connected users in organization
    for (const [userId, ws] of this.wsConnections) {
      const user = await this.userService.getUser(userId);
      
      if (user.organizationId === organizationId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'TaskUpdated',
          data: task
        }));
      }
    }
  }
}
```

## 3. Event Bus Implementation

```typescript
type EventHandler<T> = (event: T) => Promise<void>;

class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  
  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
  }
  
  async publish<T>(event: { type: string; data: T }): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    
    // Fire-and-forget (non-blocking)
    // In production, would use message queue
    Promise.all(
      handlers.map(handler => 
        handler(event.data).catch(error => 
          console.error(`Handler failed: ${error}`)
        )
      )
    ).catch(() => {}); // Ignore errors
  }
}

// Better: Use Message Queue (RabbitMQ, Kafka)
class MessageQueueEventBus {
  constructor(private queue: MessageQueue) {}
  
  async publish(event: Event): Promise<void> {
    // Ensure delivery even if server crashes
    await this.queue.publish(`events.${event.type}`, event);
  }
  
  async subscribe<T>(eventType: string, handler: EventHandler<T>): Promise<void> {
    // Worker process continuously polls queue
    setInterval(async () => {
      const messages = await this.queue.consume(`events.${eventType}`);
      
      for (const message of messages) {
        try {
          await handler(message.data);
          await message.ack(); // Mark as processed
        } catch (error) {
          // Retry or send to DLQ
          await message.nack(true); // Requeue
        }
      }
    }, 1000);
  }
}
```

## 12. Practical Exercise

### Build an Event-Driven Notification System

**Requirements:**
1. Publish events when tasks/comments are created
2. Subscribe to events and send notifications
3. Handle failures and retries
4. Track event history

### Structure

```typescript
class EventDrivenNotificationSystem {
  async publishTaskEvent(task: Task): Promise<void> {
    // TODO: Publish to event bus
  }
  
  async subscribeToEvents(): Promise<void> {
    // TODO: Listen for events and send notifications
  }
  
  async handleEventFailure(event: Event): Promise<void> {
    // TODO: Retry logic
  }
}
```

---

## Next Lesson

Continue to [Database Optimization](05-database-optimization.md)
