# Distributed Systems Basics - Handling Scale Across Multiple Machines

> Explore CAP theorem, eventual consistency, and the challenges of building systems across multiple servers

## 1. Core Concepts

### The CAP Theorem

In a distributed system, you can only guarantee 2 of 3 properties:

```
      ┌─────────────────┐
      │   Consistency   │ (All nodes see same data)
      └────────┬────────┘
               │
  ┌────────────┼────────────┐
  │                         │
┌─┴──┐                    ┌──┴──┐
│ CA │ (MongoDB)          │ AP  │
│    │ (No partitions)    │ (DNS)
└────┘                    └─────┘
  │  (Partition Tolerant = No communication failures)
  │
  CP (PostgreSQL clusters, Spanner)
  (Sacrifices availability for consistency)
```

## 2. Real-World Applications

### Banking System - Consistency Critical (CP)

```typescript
// Consistency > Availability
// User must NOT withdraw more than balance, even if network partitions

class BankingSystem {
  async transfer(fromAccount: string, toAccount: string, amount: number): Promise<void> {
    const transaction = db.transaction();
    
    try {
      // Atomic: Both operations succeed or both fail
      await transaction.execute(async () => {
        const fromBalance = await db.account.findUnique({ where: { id: fromAccount } });
        
        if (fromBalance.balance < amount) {
          throw new Error('Insufficient funds');
        }
        
        // Deduct and add atomically
        await db.account.update(
          { where: { id: fromAccount } },
          { balance: { decrement: amount } }
        );
        
        await db.account.update(
          { where: { id: toAccount } },
          { balance: { increment: amount } }
        );
      });
    } catch (e) {
      throw e; // Fails completely, no partial transfer
    }
  }
}
```

### Social Media - Availability Critical (AP)

```typescript
// Availability > Consistency
// User might see slightly old feed data, but site always works

class SocialMediaFeed {
  async getFeeds(userId: string): Promise<Post[]> {
    try {
      // Try to get latest from primary
      return await this.primaryDb.posts.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      // Network partition? Return cached/stale data
      return await this.cache.getFeedCache(userId) || 
             await this.readReplica.posts.findMany({
               where: { followerId: userId }
             });
    }
  }
}
```

### SaaS Tasks - Eventual Consistency (AP)

```typescript
// For your Jira-like platform
// Task created must eventually appear, but doesn't need to be instant

class EventuallyConsistentTask {
  async createTask(organizationId: string, data: CreateTaskData): Promise<Task> {
    // 1. Write to local cache immediately (return to user quickly)
    const taskId = generateId();
    const task = { id: taskId, ...data };
    
    await this.cache.set(`task:${taskId}`, task);
    
    // 2. Asynchronously write to primary database
    this.eventQueue.emit('TaskCreated', { organizationId, task });
    
    // 3. Propagate to read replicas eventually
    // User sees task immediately in their UI (from cache)
    // Other users might see it delayed (eventual consistency)
    
    return task;
  }
  
  async processTaskCreation(event: TaskEvent): Promise<void> {
    try {
      // Write to primary
      await this.primaryDb.task.create({
        data: event.task
      });
      
      // Replicate to other regions/replicas
      await Promise.all([
        this.replica1.task.create({ data: event.task }),
        this.replica2.task.create({ data: event.task })
      ]);
    } catch (error) {
      // Retry logic - will eventually succeed
      this.retryQueue.push(event);
    }
  }
}
```

## 3. Distributed Transactions (Saga Pattern)

```typescript
// Creating a task involves multiple services:
// TaskService → ProjectService → NotificationService → ActivityLogService
// If any fails, must rollback all!

class CreateTaskSaga {
  async execute(data: CreateTaskData): Promise<Task> {
    const saga = new Saga();
    let createdTask: Task;
    
    try {
      // Step 1: Create task in Task Service
      createdTask = await saga.step(
        'CreateTask',
        () => this.taskService.create(data),
        (task) => this.taskService.delete(task.id) // Compensation
      );
      
      // Step 2: Update project stats
      await saga.step(
        'UpdateProjectStats',
        () => this.projectService.incrementTaskCount(data.projectId),
        () => this.projectService.decrementTaskCount(data.projectId)
      );
      
      // Step 3: Post notification
      await saga.step(
        'NotifyTeam',
        () => this.notificationService.sendTaskCreated(createdTask),
        () => this.notificationService.deleteNotification(createdTask.id)
      );
      
      // Step 4: Log activity
      await saga.step(
        'LogActivity',
        () => this.activityLog.log({ action: 'task.created', taskId: createdTask.id }),
        () => this.activityLog.delete(createdTask.id)
      );
      
      return createdTask;
    } catch (error) {
      // If any step fails, rollback all previous steps in reverse order
      await saga.compensate();
      throw error;
    }
  }
}

// Saga Pattern Implementation
class Saga {
  private steps: Step[] = [];
  
  async step<T>(
    name: string,
    action: () => Promise<T>,
    compensation: (result?: T) => Promise<void>
  ): Promise<T> {
    try {
      const result = await action();
      this.steps.push({ name, compensation, result });
      return result;
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }
  
  async compensate(): Promise<void> {
    // Compensate in reverse order
    for (let i = this.steps.length - 1; i >= 0; i--) {
      await this.steps[i].compensation(this.steps[i].result);
    }
  }
}
```

## 4. Handling Network Failures

```typescript
class ResilientDistributedService {
  // Retry with exponential backoff
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait longer each time: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt) * 1000;
          await this.sleep(delayMs);
        }
      }
    }
    
    throw lastError;
  }
  
  // Circuit Breaker Pattern
  class CircuitBreaker {
    private failureCount = 0;
    private lastFailureTime = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (this.state === 'OPEN') {
        // Too many failures, reject immediately
        if (Date.now() - this.lastFailureTime > 60000) {
          // Try again after 1 minute
          this.state = 'HALF_OPEN';
        } else {
          throw new CircuitBreakerError('Circuit is OPEN');
        }
      }
      
      try {
        const result = await fn();
        
        if (this.state === 'HALF_OPEN') {
          // Success after recovery attempt
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
        
        return result;
      } catch (error) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount > 5) {
          this.state = 'OPEN';
        }
        
        throw error;
      }
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 5. Consensus Algorithms

```typescript
// Raft Consensus - Leader-based replication
class RaftConsensus {
  private leaders: Server[] = [];
  private followers: Server[] = [];
  
  async replicate<T>(data: T): Promise<void> {
    const leader = this.getLeader();
    
    // 1. Send to leader
    await leader.append(data);
    
    // 2. Leader replicates to majority of followers
    const replicationPromises = this.followers.map(follower =>
      this.sendWithRetry(() => follower.append(data))
    );
    
    // 3. Wait for majority (n/2 + 1) to confirm
    const results = await Promise.allSettled(replicationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    if (successCount < Math.ceil(this.followers.length / 2)) {
      throw new Error('Failed to replicate to majority');
    }
  }
  
  private getLeader(): Server {
    // Election happens if leader dies
    // All servers vote on new leader
    // Majority must agree
    return this.leaders[0]; // Simplified
  }
}
```

## 12. Practical Exercise

### Requirements
1. Handle network failures gracefully
2. Implement eventual consistency
3. Build a saga for multi-step operations
4. Use circuit breaker pattern

### Structure

```typescript
class DistributedTaskSystem {
  async createTaskWithRetry(data: CreateTaskData): Promise<Task> {
    // TODO: Use retry mechanism for resilience
  }
  
  async createTaskAcrossServices(data: CreateTaskData): Promise<Task> {
    // TODO: Use Saga pattern for distributed transaction
  }
  
  async handleNetworkFailure(): Promise<void> {
    // TODO: Circuit breaker pattern
  }
}
```

---

## Next Lesson

Continue to [Event-Driven Architecture](04-event-driven-architecture.md)
