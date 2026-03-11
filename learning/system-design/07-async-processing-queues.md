# Async Processing & Queues - Handling Heavy Workloads

> Build reliable job queues, handle failures gracefully, and process millions of tasks asynchronously

## 1. Core Concepts

### Synchronous vs Asynchronous Processing

```
Synchronous (Blocking):
POST /tasks → Create task → Send email → Update dashboard → Return (5 seconds)
User waits 5 seconds for response!

Asynchronous (Non-blocking):
POST /tasks → Create task → Queue email job → Return (50ms)
                              ↓ (background worker)
                           Send email asynchronously
                           Update dashboard in real-time via WebSocket
User gets response immediately, updates come later!
```

## 2. Real-World Applications

### Example 1: Simple Job Queue

```typescript
// Using Bull (a popular Node.js job queue)
import Queue from 'bull';

class JobQueueService {
  private emailQueue: Queue.Queue;
  private reportQueue: Queue.Queue;
  
  constructor() {
    // Create queues
    this.emailQueue = new Queue('emails', {
      redis: { host: 'localhost', port: 6379 }
    });
    
    this.reportQueue = new Queue('reports', {
      redis: { host: 'localhost', port: 6379 }
    });
    
    this.setupProcessors();
  }
  
  private setupProcessors(): void {
    // Process email jobs
    this.emailQueue.process(5, async (job) => {
      // 5 concurrent workers
      const { to, subject, body } = job.data;
      
      try {
        await this.sendEmail(to, subject, body);
        return { success: true };
      } catch (error) {
        // Throw error to trigger retry
        throw error;
      }
    });
    
    // Process report jobs
    this.reportQueue.process(async (job) => {
      const { organizationId, reportType } = job.data;
      
      await this.generateReport(organizationId, reportType);
      return { success: true };
    });
  }
  
  async queueEmail(to: string, subject: string, body: string): Promise<void> {
    // Add job to queue (returns immediately)
    await this.emailQueue.add(
      { to, subject, body },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    );
  }
  
  async queueReport(organizationId: string, reportType: string): Promise<void> {
    await this.reportQueue.add(
      { organizationId, reportType },
      { priorities: 'high' }
    );
  }
  
  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Call email service
    await emailService.send({ to, subject, html: body });
  }
  
  private async generateReport(organizationId: string, reportType: string): Promise<void> {
    // Generate and save report
  }
}
```

### Example 2: Job With Retry Logic

```typescript
class RetryableJobQueue {
  async processJobWithRetry(job: Job): Promise<void> {
    const maxRetries = 5;
    const backoffMultiplier = 2; // exponential backoff
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Attempt job
        await this.executeJob(job);
        return; // Success!
      } catch (error) {
        if (attempt === maxRetries) {
          // All retries exhausted
          await this.sendToDeadLetterQueue(job, error);
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delayMs = Math.pow(backoffMultiplier, attempt) * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
        await this.sleep(delayMs);
      }
    }
  }
  
  private async sendToDeadLetterQueue(job: Job, error: Error): Promise<void> {
    // Log and store for manual inspection
    await db.deadLetterQueue.create({
      jobType: job.name,
      data: job.data,
      error: error.message,
      attemptedAt: new Date()
    });
    
    // Alert engineers
    await alerting.sendAlert(`Job failed after all retries: ${job.name}`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Example 3: Bulk Processing

```typescript
class BulkProcessingQueue {
  async bulkCreateTasks(
    organizationId: string,
    tasks: CreateTaskData[]
  ): Promise<BulkJobResult> {
    const batchSize = 100;
    const jobId = generateId();
    
    // Break into batches
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      // Queue each batch
      await this.bulkQueue.add({
        jobId,
        organizationId,
        tasks: batch,
        batchIndex: Math.floor(i / batchSize),
        totalBatches: Math.ceil(tasks.length / batchSize)
      });
    }
    
    return { jobId, totalTasks: tasks.length };
  }
  
  async processBatch(job: Job): Promise<void> {
    const { jobId, organizationId, tasks } = job.data;
    
    // Process all tasks in batch
    const created = await db.task.createMany({
      data: tasks.map(t => ({
        ...t,
        organizationId
      }))
    });
    
    // Update progress
    await this.jobProgress.set(jobId, { created: created.length });
  }
  
  async getBulkJobStatus(jobId: string): Promise<BulkResult> {
    const jobs = await this.bulkQueue.getJobs(
      'completed',
      `jobId:${jobId}`
    );
    
    const progress = await this.jobProgress.get(jobId);
    
    return {
      jobId,
      status: jobs.length > 0 ? 'completed' : 'processing',
      created: progress?.created || 0
    };
  }
}
```

### Example 4: Scheduled Jobs

```typescript
// Jobs that run at specific times or intervals
class ScheduledJobQueue {
  constructor(private queue: Queue.Queue) {
    this.setupScheduledJobs();
  }
  
  private setupScheduledJobs(): void {
    // Email digest every morning at 8 AM
    this.queue.add(
      { type: 'SendDailyDigest' },
      { repeat: { cron: '0 8 * * *' } }
    );
    
    // Generate weekly reports every Monday at 9 AM
    this.queue.add(
      { type: 'GenerateWeeklyReports' },
      { repeat: { cron: '0 9 * * 1' } }
    );
    
    // Cleanup old activities every day at 2 AM
    this.queue.add(
      { type: 'CleanupOldActivities' },
      { repeat: { cron: '0 2 * * *' } }
    );
  }
  
  async sendDailyDigest(): Promise<void> {
    const users = await db.user.findMany({
      where: { emailDigestEnabled: true }
    });
    
    for (const user of users) {
      const activities = await db.activityLog.findMany({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      
      await this.emailQueue.add({
        to: user.email,
        subject: 'Daily Digest',
        body: this.renderDigestEmail(activities)
      });
    }
  }
  
  async cleanupOldActivities(): Promise<void> {
    // Delete activities older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await db.activityLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo }
      }
    });
  }
}
```

### Example 5: Priority Queue

```typescript
class PriorityQueueService {
  async queueTask(taskData: any, priority: 'low' | 'normal' | 'high' | 'urgent'): Promise<void> {
    const priorityWeights = {
      'low': 1,
      'normal': 5,
      'high': 10,
      'urgent': 100
    };
    
    await this.queue.add(taskData, {
      priority: priorityWeights[priority]
    });
  }
  
  // Urgent emails get processed before low-priority ones
  async queueEmail(
    to: string,
    subject: string,
    body: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    await this.queueTask(
      { to, subject, body },
      priority
    );
  }
}
```

### Example 6: Worker Pool Management

```typescript
class WorkerPool {
  private workers: Worker[] = [];
  private workerCount: number = 4; // CPUs available
  
  async initialize(): Promise<void> {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker('./worker.ts');
      
      // Listen for job completions
      worker.on('message', async (result) => {
        await this.handleJobResult(result);
      });
      
      worker.on('error', (error) => {
        console.error('Worker error:', error);
        // Restart worker
        this.restartWorker(i);
      });
      
      this.workers.push(worker);
    }
  }
  
  async executeJob(job: Job): Promise<void> {
    // Find least busy worker
    const availableWorker = this.workers.find(w => !w.isBusy);
    
    if (!availableWorker) {
      // Queue job if all workers busy
      await this.queue.add(job);
      return;
    }
    
    // Send job to worker
    availableWorker.postMessage({ type: 'PROCESS_JOB', job });
  }
  
  private async handleJobResult(result: JobResult): Promise<void> {
    if (result.success) {
      console.log(`Job ${result.jobId} completed`);
    } else {
      console.error(`Job ${result.jobId} failed:`, result.error);
      // Retry or DLQ
    }
  }
  
  private restartWorker(index: number): void {
    const worker = new Worker('./worker.ts');
    this.workers[index] = worker;
  }
  
  shutdown(): void {
    this.workers.forEach(w => w.terminate());
  }
}
```

### Example 7: Rate Limiting with Queues

```typescript
class RateLimitedQueue {
  async queueWithRateLimit(
    job: Job,
    rateLimit: { operations: number; timeWindow: number } // e.g., 100 per minute
  ): Promise<void> {
    const key = `rate:${job.type}`;
    
    // Get current count
    const currentCount = await this.redis.incr(key);
    
    if (currentCount === 1) {
      // First request in time window, set expiry
      await this.redis.expire(key, rateLimit.timeWindow);
    }
    
    if (currentCount > rateLimit.operations) {
      // Rate limit exceeded, delay job
      const waitTime = Math.ceil(rateLimit.timeWindow / rateLimit.operations);
      await this.queue.add(job, {
        delay: waitTime * 1000
      });
    } else {
      // Under limit, process immediately
      await this.queue.add(job);
    }
  }
}
```

## 3. Monitoring Queue Health

```typescript
class QueueMonitoring {
  async trackQueueMetrics(): Promise<void> {
    setInterval(async () => {
      const metrics = {
        emailQueue: {
          waiting: await this.emailQueue.getWaitingCount(),
          active: await this.emailQueue.getActiveCount(),
          completed: await this.emailQueue.getCompletedCount(),
          failed: await this.emailQueue.getFailedCount()
        },
        reportQueue: {
          waiting: await this.reportQueue.getWaitingCount(),
          active: await this.reportQueue.getActiveCount(),
          completed: await this.reportQueue.getCompletedCount(),
          failed: await this.reportQueue.getFailedCount()
        }
      };
      
      // Alert if queue is backing up
      if (metrics.emailQueue.waiting > 1000) {
        await alerting.sendAlert('Email queue backed up: 1000+ jobs waiting');
      }
      
      if (metrics.emailQueue.failed > 10) {
        await alerting.sendAlert('Email queue has failed jobs, check DLQ');
      }
      
      // Log metrics
      console.log('Queue metrics:', metrics);
    }, 60000); // Every minute
  }
}
```

## 12. Practical Exercise

### Build a Robust Job Queue System

**Requirements:**
1. Create queues for different job types
2. Implement retry logic with exponential backoff
3. Handle failed jobs with DLQ
4. Support bulk processing
5. Monitor queue health
6. Implement rate limiting

### Structure

```typescript
class JobQueueSystem {
  async setupQueues(): Promise<void> {
    // TODO: Create email, report, bulk job queues
  }
  
  async implementRetryLogic(): Promise<void> {
    // TODO: Exponential backoff and max retries
  }
  
  async handleFailedJobs(): Promise<void> {
    // TODO: Dead letter queue
  }
  
  async processBulkJobs(): Promise<void> {
    // TODO: Batch processing with progress tracking
  }
  
  async monitorQueueHealth(): Promise<void> {
    // TODO: Track metrics and alert
  }
}
```

---

## System Design Complete

Congratulations! You've mastered the key patterns for building scalable SaaS systems:
- ✅ Multi-tenant architecture
- ✅ Horizontal scaling & load balancing
- ✅ Distributed systems resilience
- ✅ Event-driven architecture
- ✅ Database optimization
- ✅ Caching strategies
- ✅ Async processing & queues

**Next:** Continue to [Backend Concepts](../backend-concepts/README.md)
