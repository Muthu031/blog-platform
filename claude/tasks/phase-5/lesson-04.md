# Lesson 4: Background Job Workers

## 🎯 Goal
Implement reliable background job workers for asynchronous task processing.

## 📚 What You'll Learn
- Create worker processes
- Handle job failures gracefully
- Implement retry strategies
- Monitor job execution

## 📋 Prerequisites
- Completed Phase 5 Lessons 1-3
- BullMQ configured
- Redis running

## 🛠️ Tasks

### 1. Create Worker Application

Create `backend/src/workers/main.ts`:

```typescript
import { queueManager } from '../services/queue';
import {
  setupEmailProcessor,
  setupNotificationProcessor,
  setupReportProcessor
} from '../jobs/processors';

/**
 * Initialize and start all workers
 */
async function startWorkers() {
  console.log('🚀 Starting job workers...');

  try {
    // Register all processors
    setupEmailProcessor();
    setupNotificationProcessor();
    setupReportProcessor();

    console.log('✅ All workers initialized');

    // Keep process running
    process.on('SIGTERM', async () => {
      console.log('Shutting down workers gracefully...');
      await queueManager.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Shutting down workers...');
      await queueManager.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Worker startup failed:', error);
    process.exit(1);
  }
}

startWorkers();
```

### 2. Create Error Handling

Create `backend/src/services/jobErrorHandler.ts`:

```typescript
export class JobErrorHandler {
  /**
   * Handle job failure
   */
  static async handleFailure(job: any, error: Error, attempt: number, maxAttempts: number) {
    console.error(`Job ${job.id} failed (attempt ${attempt}/${maxAttempts}):`, error);

    if (attempt >= maxAttempts) {
      // Max retries exceeded - log to database
      await this.logFailedJob(job, error);

      // Send alert email
      await this.sendAlertEmail(job, error);
    }
  }

  /**
   * Log failed job to database
   */
  private static async logFailedJob(job: any, error: Error) {
    try {
      await prisma.failedJob.create({
        data: {
          jobId: job.id,
          jobName: job.name,
          queueName: job.queueName,
          data: job.data,
          error: error.message,
          stack: error.stack
        }
      });
    } catch (err) {
      console.error('Failed to log job failure:', err);
    }
  }

  /**
   * Send alert email for critical failures
   */
  private static async sendAlertEmail(job: any, error: Error) {
    try {
      if (job.name === 'critical-task') {
        // Send alert to admin
        console.log(`Critical job ${job.id} failed, sending alert`);
      }
    } catch (err) {
      console.error('Failed to send alert:', err);
    }
  }

  /**
   * Implement exponential backoff
   */
  static getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 60000); // Max 60s
  }

  /**
   * Dead letter storage for failed jobs
   */
  static async moveToDeadLetter(job: any) {
    try {
      const deadLetterQueue = queueManager.getQueue('dead-letter');
      await deadLetterQueue.add(job.name, job.data, {
        deadLetterCount: (job.attemptsMade || 0) + 1
      });
    } catch (err) {
      console.error('Failed to move job to dead letter:', err);
    }
  }
}
```

### 3. Create Job Monitor

Create `backend/src/services/jobMonitor.ts`:

```typescript
import { queueManager } from './queue';
import { redis } from './redis';

export class JobMonitor {
  /**
   * Get job statistics
   */
  static async getQueueStats(queueName: string) {
    const queue = queueManager.getQueue(queueName);
    const counts = await queue.getJobCounts();

    return {
      waiting: counts.wait,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed
    };
  }

  /**
   * Get all queue statistics
   */
  static async getAllQueueStats() {
    const queues = ['emails', 'notifications', 'reports'];
    const stats: any = {};

    for (const queueName of queues) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  /**
   * Monitor slow jobs
   */
  static async monitorSlowJobs(queueName: string, thresholdMs: number = 30000) {
    const queue = queueManager.getQueue(queueName);
    const jobs = await queue.getJobs(['active']);

    const slowJobs = jobs.filter(job => {
      const duration = Date.now() - (job.finishedOn || job.processedOn || 0);
      return duration > thresholdMs;
    });

    return slowJobs;
  }

  /**
   * Get recent failed jobs
   */
  static async getRecentFailedJobs(queueName: string, limit: number = 10) {
    const queue = queueManager.getQueue(queueName);
    return queue.getJobs(['failed'], 0, limit - 1);
  }

  /**
   * Setup monitoring dashboard endpoint
   */
  static setupMonitoringEndpoint(app: any) {
    app.get('/api/jobs/stats', async (req: any, res: any) => {
      try {
        const stats = await JobMonitor.getAllQueueStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/jobs/failed', async (req: any, res: any) => {
      try {
        const queueName = req.query.queue || 'emails';
        const failed = await JobMonitor.getRecentFailedJobs(queueName);
        res.json(failed);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/jobs/slow', async (req: any, res: any) => {
      try {
        const queueName = req.query.queue || 'emails';
        const slow = await JobMonitor.monitorSlowJobs(queueName);
        res.json(slow);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
}
```

### 4. Create Worker Startup Script

Update `package.json`:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "start:workers": "node dist/workers/main.js",
    "dev": "ts-node src/server.ts",
    "dev:workers": "ts-node src/workers/main.ts"
  }
}
```

### 5. Docker Configuration for Workers

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: blog_platform
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/blog_platform
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis

  workers:
    build: ./backend
    entrypoint: npm run start:workers
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/blog_platform
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    scale: 3  # Run 3 worker instances
```

## ✅ Verification Checklist

- [ ] Worker process starts successfully
- [ ] All job processors initialize
- [ ] Jobs are processed from queues
- [ ] Failed jobs retry with backoff
- [ ] Job statistics are tracked
- [ ] Slow jobs are identified
- [ ] Failed jobs are logged
- [ ] Graceful shutdown works
- [ ] Multiple workers can run in parallel
- [ ] Job monitoring endpoints work

## 📚 Resources

- [Worker Patterns](https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html)
- [Job Queues](https://bullmq.io/)
- [Process Management](http://pm2.keymetrics.io/)
