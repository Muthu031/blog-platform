# Queues - FIFO Processing

> First In, First Out - Essential for job processing, task scheduling, and message systems

## 1. Concept Overview

A Queue is a linear data structure that follows FIFO (First In, First Out). Like a line at a store - first person in line is first to be served. Critical for background jobs, notifications, email queues, and task processing.

**Key Operations:**
- `enqueue(item)`: Add to back - O(1)
- `dequeue()`: Remove from front - O(1)
- `peek()`: View front without removing - O(1)  
- `isEmpty()`: Check if empty - O(1)

## 2. Core Principles

```typescript
class Queue<T> {
  private items: T[] = [];
  
  enqueue(item: T): void {
    this.items.push(item);
  }
  
  dequeue(): T | undefined {
    return this.items.shift();
  }
  
  peek(): T | undefined {
    return this.items[0];
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
}
```

## 3. Real-World Usage in SaaS

**1. Background Job Processing**
- Email queue (send in order)
- Image processing pipeline
- Report generation

**2. Message Queues**
- RabbitMQ, AWS SQS, Redis Queue
- Event processing
- Microservice communication

**3. Rate Limiting**
- Request throttling
- API rate limits
- Worker pools

## 4. Practical Examples

### Example 1: Email Queue Service

```typescript
interface EmailJob {
  id: string;
  to: string;
  subject: string;
  body: string;
  priority: 'high' | 'normal';
  retries: number;
  createdAt: Date;
}

class EmailQueueService {
  private queue: Queue<EmailJob> = new Queue();
  private processing = false;
  
  async addToQueue(email: Omit<EmailJob, 'id' | 'retries' | 'createdAt'>): Promise<void> {
    const job: EmailJob = {
      ...email,
      id: generateId(),
      retries: 0,
      createdAt: new Date()
    };
    
    this.queue.enqueue(job);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (!this.queue.isEmpty()) {
      const job = this.queue.dequeue()!;
      
      try {
        await this.sendEmail(job);
        console.log(`Email sent: ${job.id}`);
      } catch (error) {
        console.error(`Email failed: ${job.id}`, error);
        
        // Retry logic
        if (job.retries < 3) {
          job.retries++;
          this.queue.enqueue(job); // Re-queue
        } else {
          await this.logFailure(job);
        }
      }
      
      // Rate limiting: Wait between emails
      await this.sleep(100);
    }
    
    this.processing = false;
  }
  
  private async sendEmail(job: EmailJob): Promise<void> {
    // Email sending logic
    await emailProvider.send(job.to, job.subject, job.body);
  }
  
  private async logFailure(job: EmailJob): Promise<void> {
    await db.failedJob.create({
      data: {
        type: 'email',
        jobId: job.id,
        error: 'Max retries exceeded',
        data: JSON.stringify(job)
      }
    });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const emailQueue = new EmailQueueService();

await emailQueue.addToQueue({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for joining',
  priority: 'high'
});
```

### Example 2: Task Processing with Bull Queue (Redis)

```typescript
import Bull from 'bull';

// Define job data
interface NotificationJobData {
  userId: string;
  type: string;
  message: string;
  metadata?: any;
}

class NotificationQueueService {
  private queue: Bull.Queue<NotificationJobData>;
  
  constructor() {
    this.queue = new Bull('notifications', {
      redis: {
        host: 'localhost',
        port: 6379
      }
    });
    
    this.setupProcessor();
  }
  
  async addNotification(data: NotificationJobData, priority?: number): Promise<void> {
    await this.queue.add(data, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
  
  private setupProcessor(): void {
    this.queue.process(5, async (job) => { // 5 concurrent workers
      const { userId, type, message, metadata } = job.data;
      
      await this.sendNotification(userId, type, message, metadata);
      
      return { success: true, jobId: job.id };
    });
    
    this.queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed:`, result);
    });
    
    this.queue.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }
  
  private async sendNotification(
    userId: string,
    type: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await db.notification.create({
      data: {
        userId,
        type,
        message,
        metadata,
        status: 'sent',
        sentAt: new Date()
      }
    });
  }
  
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);
    
    return { waiting, active, completed, failed };
  }
}

// Usage in service
class TaskService {
  constructor(private notificationQueue: NotificationQueueService) {}
  
  async createTask(data: CreateTaskDto, userId: string): Promise<Task> {
    const task = await db.task.create({ data });
    
    // Queue notification (non-blocking)
    await this.notificationQueue.addNotification({
      userId: task.assigneeId!,
      type: 'task_assigned',
      message: `New task assigned: ${task.title}`,
      metadata: { taskId: task.id }
    }, 5); // Priority 5
    
    return task;
  }
}
```

### Example 3: Priority Queue for Task Scheduling

```typescript
class PriorityQueue<T> {
  private items: Array<{ priority: number; value: T }> = [];
  
  enqueue(value: T, priority: number): void {
    const item = { priority, value };
    let added = false;
    
    // Insert in priority order
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }
    
    if (!added) {
      this.items.push(item);
    }
  }
  
  dequeue(): T | undefined {
    return this.items.shift()?.value;
  }
  
  peek(): T | undefined {
    return this.items[0]?.value;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// Usage: Task scheduler
interface ScheduledTask {
  id: string;
  action: () => Promise<void>;
  priority: number;
}

class TaskScheduler {
  private queue = new PriorityQueue<ScheduledTask>();
  private running = false;
  
  schedule(task: ScheduledTask): void {
    this.queue.enqueue(task, task.priority);
    
    if (!this.running) {
      this.run();
    }
  }
  
  private async run(): Promise<void> {
    this.running = true;
    
    while (!this.queue.isEmpty()) {
      const task = this.queue.dequeue()!;
      
      try {
        await task.action();
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error);
      }
    }
    
    this.running = false;
  }
}

// Usage
const scheduler = new TaskScheduler();

scheduler.schedule({
  id: '1',
  priority: 10,
  action: async () => {
    await sendUrgentEmail();
  }
});

scheduler.schedule({
  id: '2',
  priority: 5,
  action: async () => {
    await sendNormalEmail();
  }
});
```

## 5. Backend Architecture

### Complete Queue-Based Architecture

```typescript
// ======= Job Interface =======
interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
}

// ======= Queue Service =======
class JobQueueService<T = any> {
  private queue: Queue<Job<T>> = new Queue();
  private processing = false;
  private concurrency: number;
  
  constructor(
    private processor: (job: Job<T>) => Promise<void>,
    options: { concurrency?: number } = {}
  ) {
    this.concurrency = options.concurrency || 1;
  }
  
  async add(type: string, data: T, priority: number = 5): Promise<string> {
    const job: Job<T> = {
      id: generateId(),
      type,
      data,
      priority,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date()
    };
    
    this.queue.enqueue(job);
    
    if (!this.processing) {
      this.process();
    }
    
    return job.id;
  }
  
  private async process(): Promise<void> {
    this.processing = true;
    const workers: Promise<void>[] = [];
    
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.worker());
    }
    
    await Promise.all(workers);
    this.processing = false;
  }
  
  private async worker(): Promise<void> {
    while (!this.queue.isEmpty()) {
      const job = this.queue.dequeue();
      if (!job) break;
      
      try {
        await this.processor(job);
        job.processedAt = new Date();
      } catch (error) {
        job.attempts++;
        
        if (job.attempts < job.maxAttempts) {
          this.queue.enqueue(job); // Retry
        } else {
          await this.handleFailure(job, error);
        }
      }
    }
  }
  
  private async handleFailure(job: Job<T>, error: any): Promise<void> {
    await db.failedJob.create({
      data: {
        jobId: job.id,
        type: job.type,
        data: JSON.stringify(job.data),
        error: error.message,
        attempts: job.attempts
      }
    });
  }
}

// ======= Usage =======
const emailQueue = new JobQueueService<EmailJobData>(
  async (job) => {
    await emailService.send(job.data);
  },
  { concurrency: 5 }
);

await emailQueue.add('welcome-email', {
  to: 'user@example.com',
  template: 'welcome'
});
```

## 12. Practical Exercise

### Task: Build a Notification Queue System

**Requirements:**
1. Queue notifications for multiple channels (email, SMS, push)
2. Process with priority (urgent notifications first)
3. Support retry with exponential backoff
4. Track queue statistics (waiting, processing, completed, failed)
5. Store queue in Redis for persistence
6. Add admin API for queue management

**Implementation:**

```typescript
interface NotificationJob {
  userId: string;
  channel: 'email' | 'sms' | 'push';
  message: string;
  priority: 'urgent' | 'high' | 'normal';
}

class NotificationQueueService {
  async enqueue(job: NotificationJob): Promise<string> {
    // TODO: Add to queue
  }
  
  async process(): Promise<void> {
    // TODO: Process jobs from queue
  }
  
  async getStats(): Promise<QueueStats> {
    // TODO: Return queue statistics
  }
  
  async retry(jobId: string): Promise<void> {
    // TODO: Retry failed job
  }
}
```

**Success Criteria:**
- ✅ Jobs processed in priority order
- ✅ Failed jobs retry automatically
- ✅ Queue persists across restarts
- ✅ Statistics available via API
- ✅ Configurable concurrency

---

## Next Lesson

Continue to [Trees - Hierarchical Data](05-trees.md)
