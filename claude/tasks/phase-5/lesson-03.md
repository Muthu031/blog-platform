# Lesson 3: BullMQ Setup

## 🎯 Goal
Set up BullMQ for task queuing and background job processing.

## 📚 What You'll Learn
- Install and configure BullMQ
- Create job queues
- Process jobs in background
- Handle job failures and retries

## 📋 Prerequisites
- Completed Phase 5 Lessons 1-2
- Redis running
- Backend server ready

## 🛠️ Tasks

### 1. Install BullMQ

```bash
cd backend
npm install bullmq
npm install -D @types/bullmq
```

### 2. Create Queue Manager

Create `backend/src/services/queue.ts`:

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Get or create queue
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, { connection: redis });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  /**
   * Create job
   */
  async addJob<T>(queueName: string, jobName: string, data: T, options?: any) {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      ...options
    });
  }

  /**
   * Register job processor
   */
  registerProcessor<T>(
    queueName: string,
    jobName: string,
    processor: (data: T) => Promise<void>,
    concurrency: number = 1
  ) {
    const queue = this.getQueue(queueName);

    const worker = new Worker(queueName, async (job) => {
      if (job.name === jobName || !jobName) {
        console.log(`Processing ${job.name} job:`, job.id);
        await processor(job.data);
      }
    }, {
      connection: redis,
      concurrency
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.workers.set(`${queueName}-${jobName}`, worker);

    return worker;
  }

  /**
   * Get queue events
   */
  getQueueEvents(name: string) {
    const queue = this.getQueue(name);
    return new QueueEvents(name, { connection: redis });
  }

  /**
   * Close all queues and workers
   */
  async close() {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}

export const queueManager = new QueueManager();
```

### 3. Create Specific Queues

Create `backend/src/jobs/index.ts`:

```typescript
import { queueManager } from '../services/queue';

export enum JobType {
  SEND_EMAIL = 'send-email',
  SEND_NOTIFICATION = 'send-notification',
  GENERATE_REPORT = 'generate-report',
  PROCESS_IMAGE = 'process-image',
  BACKUP_DATABASE = 'backup-database'
}

/**
 * Email Queue
 */
export const emailQueue = {
  async send(to: string, subject: string, template: string, data: any) {
    return queueManager.addJob('emails', JobType.SEND_EMAIL, {
      to,
      subject,
      template,
      data
    });
  }
};

/**
 * Notification Queue
 */
export const notificationQueue = {
  async send(userId: string, title: string, message: string) {
    return queueManager.addJob('notifications', JobType.SEND_NOTIFICATION, {
      userId,
      title,
      message
    });
  }
};

/**
 * Report Queue
 */
export const reportQueue = {
  async generate(organizationId: string, type: string) {
    return queueManager.addJob('reports', JobType.GENERATE_REPORT, {
      organizationId,
      type
    });
  }
};

/**
 * Image Processing Queue
 */
export const imageQueue = {
  async process(taskId: string, fileUrl: string) {
    return queueManager.addJob('images', JobType.PROCESS_IMAGE, {
      taskId,
      fileUrl
    });
  }
};
```

### 4. Create Job Processors

Create `backend/src/jobs/processors.ts`:

```typescript
import nodemailer from 'nodemailer';
import { queueManager } from '../services/queue';
import { emailQueue, notificationQueue, reportQueue } from './index';

// Setup email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Email Job Processor
 */
export const setupEmailProcessor = () => {
  queueManager.registerProcessor(
    'emails',
    'send-email',
    async (data: { to: string; subject: string; template: string; data: any }) => {
      const { to, subject, template, data: templateData } = data;

      // Render template
      const html = renderEmailTemplate(template, templateData);

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html
      });

      console.log(`Email sent to ${to}`);
    },
    5 // 5 concurrent emails
  );
};

/**
 * Notification Job Processor
 */
export const setupNotificationProcessor = () => {
  queueManager.registerProcessor(
    'notifications',
    'send-notification',
    async (data: { userId: string; title: string; message: string }) => {
      const { userId, title, message } = data;

      // Send to user via WebSocket
      wsServer.emitToUser(userId, 'notification:push', {
        title,
        message,
        createdAt: new Date()
      });

      console.log(`Notification sent to ${userId}`);
    },
    10 // 10 concurrent notifications
  );
};

/**
 * Report Job Processor
 */
export const setupReportProcessor = () => {
  queueManager.registerProcessor(
    'reports',
    'generate-report',
    async (data: { organizationId: string; type: string }) => {
      const { organizationId, type } = data;

      // Generate report
      const report = await generateReport(organizationId, type);

      // Send email
      const org = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      await emailQueue.send(org?.adminEmail!, 'Report Ready', 'report', {
        reportUrl: report.url
      });

      console.log('Report generated and sent');
    },
    2 // 2 concurrent reports
  );
};

/**
 * Initialize all processors
 */
export const initializeJobProcessors = () => {
  setupEmailProcessor();
  setupNotificationProcessor();
  setupReportProcessor();

  console.log('Job processors initialized');
};

function renderEmailTemplate(template: string, data: any): string {
  // Template rendering logic here
  return `<html>${template}</html>`;
}

async function generateReport(orgId: string, type: string): Promise<any> {
  // Report generation logic here
  return { url: '' };
}
```

### 5. Integrate with Application

Update `backend/src/app.ts`:

```typescript
import { initializeJobProcessors, emailQueue } from './jobs/processors';

// Initialize job processors
initializeJobProcessors();

// Example: Send email via queue
app.post('/api/tasks/:taskId/assign', authenticate, async (req, res) => {
  try {
    const { assigneeId } = req.body;

    // Assign task
    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: { assigneeId },
      include: { assignee: true }
    });

    // Queue email notification
    await emailQueue.send(
      task.assignee.email,
      'You have been assigned a task',
      'task-assigned',
      { taskTitle: task.title }
    );

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## ✅ Verification Checklist

- [ ] BullMQ package installed
- [ ] Queue manager initializes
- [ ] Queues are created and configured
- [ ] Jobs can be added to queues
- [ ] Job processors register successfully
- [ ] Jobs are processed in background
- [ ] Failed jobs retry with backoff
- [ ] Job events are tracked
- [ ] Multiple queues work independently
- [ ] Integration with application works

## 📚 Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Job Queue Patterns](https://www.rabbitmq.com/documentation.html)
- [Background Jobs Best Practices](https://www.sidekiq.org/)
