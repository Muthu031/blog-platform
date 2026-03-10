# Lesson 5: Scheduled Jobs

## 🎯 Goal
Implement recurring scheduled jobs for periodic tasks like cleanup, reports, and maintenance.

## 📚 What You'll Learn
- Create job scheduler
- Implement recurring tasks
- Configure job timing
- Monitor scheduled jobs

## 📋 Prerequisites
- Completed Phase 5 Lessons 1-4
- BullMQ configured
- Worker processes running

## 🛠️ Tasks

### 1. Setup Node Cron

```bash
npm install node-cron
npm install -D @types/node-cron
```

### 2. Create Job Scheduler

Create `backend/src/services/scheduler.ts`:

```typescript
import cron from 'node-cron';
import { queueManager } from './queue';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class JobScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Schedule database cleanup job
   */
  scheduleCleanup() {
    // Run daily at 2 AM
    const task = cron.schedule('0 2 * * *', async () => {
      console.log('Running cleanup job...');

      try {
        // Delete old notifications (30+ days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await prisma.notification.deleteMany({
          where: {
            createdAt: { lt: thirtyDaysAgo },
            read: true
          }
        });

        // Delete old activity logs (90+ days)
        const ninetYDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        await prisma.activityLog.deleteMany({
          where: { createdAt: { lt: ninetYDaysAgo } }
        });

        console.log('✅ Cleanup job completed');
      } catch (error) {
        console.error('❌ Cleanup job failed:', error);
      }
    });

    this.tasks.set('cleanup', task);
    return task;
  }

  /**
   * Schedule daily report generation
   */
  scheduleReports() {
    // Run daily at 9 AM
    const task = cron.schedule('0 9 * * *', async () => {
      console.log('Generating daily reports...');

      try {
        const organizations = await prisma.organization.findMany();

        for (const org of organizations) {
          await queueManager.addJob('reports', 'generate-report', {
            organizationId: org.id,
            type: 'daily'
          });
        }

        console.log(`✅ Queued ${organizations.length} report jobs`);
      } catch (error) {
        console.error('❌ Report scheduling failed:', error);
      }
    });

    this.tasks.set('reports', task);
    return task;
  }

  /**
   * Schedule backup job
   */
  scheduleBackups() {
    // Run daily at 11 PM
    const task = cron.schedule('0 23 * * *', async () => {
      console.log('Starting backup...');

      try {
        await queueManager.addJob('backups', 'backup-database', {
          timestamp: new Date()
        });

        console.log('✅ Backup job queued');
      } catch (error) {
        console.error('❌ Backup scheduling failed:', error);
      }
    });

    this.tasks.set('backups', task);
    return task;
  }

  /**
   * Schedule activity retention policy
   */
  scheduleRetentionPolicy() {
    // Run every hour
    const task = cron.schedule('0 * * * *', async () => {
      console.log('Running retention policy...');

      try {
        // Archive old activities
        const archiveDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const toArchive = await prisma.activityLog.findMany({
          where: { createdAt: { lt: archiveDate } }
        });

        if (toArchive.length > 0) {
          await queueManager.addJob('archive', 'archive-activities', {
            activities: toArchive
          });
        }

        console.log(`✅ Retention policy completed`);
      } catch (error) {
        console.error('❌ Retention policy failed:', error);
      }
    });

    this.tasks.set('retention', task);
    return task;
  }

  /**
   * Schedule inactivity notifications
   */
  scheduleInactivityReminders() {
    // Run every 6 hours
    const task = cron.schedule('0 */6 * * *', async () => {
      console.log('Checking for inactive users...');

      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const inactiveUsers = await prisma.user.findMany({
          where: {
            lastActiveAt: { lt: sevenDaysAgo }
          }
        });

        for (const user of inactiveUsers) {
          await queueManager.addJob('notifications', 'send-notification', {
            userId: user.id,
            title: 'Welcome back!',
            message: 'We miss you! Come check out what your team has been up to.'
          });
        }

        console.log(`✅ Sent reminders to ${inactiveUsers.length} users`);
      } catch (error) {
        console.error('❌ Inactivity reminder failed:', error);
      }
    });

    this.tasks.set('inactivity', task);
    return task;
  }

  /**
   * Schedule subscription renewal checks
   */
  scheduleSubscriptionChecks() {
    // Run daily at 12 AM
    const task = cron.schedule('0 0 * * *', async () => {
      console.log('Checking subscription renewals...');

      try {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const expiring = await prisma.subscription.findMany({
          where: {
            expiresAt: {
              lte: tomorrow,
              gte: new Date()
            }
          }
        });

        for (const sub of expiring) {
          await queueManager.addJob('notifications', 'send-notification', {
            userId: sub.userId,
            title: 'Subscription expiring soon',
            message: 'Your subscription expires tomorrow. Renew now to avoid interruption.'
          });
        }

        console.log(`✅ Checked ${expiring.length} expiring subscriptions`);
      } catch (error) {
        console.error('❌ Subscription check failed:', error);
      }
    });

    this.tasks.set('subscriptions', task);
    return task;
  }

  /**
   * Initialize all scheduled jobs
   */
  initializeAll() {
    console.log('🗓️  Initializing scheduled jobs...');

    this.scheduleCleanup();
    this.scheduleReports();
    this.scheduleBackups();
    this.scheduleRetentionPolicy();
    this.scheduleInactivityReminders();
    this.scheduleSubscriptionChecks();

    console.log(`✅ Scheduled ${this.tasks.size} jobs`);
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`⏹️  Stopped: ${name}`);
    }
  }

  /**
   * Get task status
   */
  getStatus() {
    const status: any = {};
    for (const [name, task] of this.tasks) {
      status[name] = {
        running: task.status().running
      };
    }
    return status;
  }
}

export const scheduler = new JobScheduler();
```

### 3. Integrate Scheduler with App

Update `backend/src/app.ts`:

```typescript
import { scheduler } from './services/scheduler';

// Initialize scheduled jobs
scheduler.initializeAll();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Stopping scheduler...');
  scheduler.stopAll();
  process.exit(0);
});

// Monitoring endpoint
app.get('/api/scheduler/status', (req, res) => {
  res.json({ jobs: scheduler.getStatus() });
});
```

## ✅ Verification Checklist

- [ ] Node-cron installed and working
- [ ] Cleanup job runs at scheduled time
- [ ] Report generation is scheduled
- [ ] Backup jobs queue properly
- [ ] Retention policy executes
- [ ] Inactivity reminders send
- [ ] Subscription checks run
- [ ] All jobs are logged
- [ ] Graceful shutdown works
- [ ] Status endpoint reports correctly

## 📚 Resources

- [Node Cron Documentation](https://github.com/node-cron/node-cron)
- [Cron Expression Format](https://crontab.guru/)
- [Job Scheduling Patterns](https://en.wikipedia.org/wiki/Cron)
