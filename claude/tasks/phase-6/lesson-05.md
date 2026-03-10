# Lesson 5: Monitoring & Logging

## 🎯 Goal
Implement comprehensive monitoring and logging for production observability.

## 📚 What You'll Learn
- Set up centralized logging
- Create performance metrics
- Configure alerts and dashboards
- Implement distributed tracing

## 📋 Prerequisites
- Completed Phase 6 Lessons 1-4
- Application deployed to production
- AWS CloudWatch access

## 🛠️ Tasks

### 1. Setup Logging Service

Create `backend/src/services/logger.ts`:

```typescript
import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new WinstonCloudWatch({
            logGroupName: '/ecs/blog-platform',
            logStreamName: `api-${process.env.NODE_ENV}`,
            awsRegion: process.env.AWS_REGION || 'us-east-1',
            messageFormatter: '{timestamp} [{level}] {message}'
          })
        ]
      : [])
  ]
});

export default logger;
```

### 2. Create Metrics Service

Create `backend/src/services/metrics.ts`:

```typescript
import StatsD from 'node-statsd';

const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: parseInt(process.env.STATSD_PORT || '8125'),
  prefix: 'blog:'
});

export class Metrics {
  /**
   * Record request latency
   */
  static recordRequestLatency(duration: number, path: string, method: string) {
    statsd.histogram(`request.latency`, duration, [`path:${path}`, `method:${method}`]);
  }

  /**
   * Record database query duration
   */
  static recordQueryDuration(duration: number, query: string) {
    statsd.histogram(`db.query.duration`, duration, [`query:${query}`]);
  }

  /**
   * Increment error count
   */
  static incrementErrorCount(type: string) {
    statsd.increment('errors', [`type:${type}`]);
  }

  /**
   * Record active connections
   */
  static recordActiveConnections(count: number) {
    statsd.gauge('connections.active', count);
  }

  /**
   * Record cache hit/miss
   */
  static recordCacheHit(hit: boolean) {
    if (hit) {
      statsd.increment('cache.hits');
    } else {
      statsd.increment('cache.misses');
    }
  }

  /**
   * Record job queue depth
   */
  static recordQueueDepth(queue: string, depth: number) {
    statsd.gauge(`queue.${queue}.depth`, depth);
  }
}

export default Metrics;
```

### 3. Create Monitoring Middleware

Create `backend/src/shared/middleware/monitoring.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../../services/logger';
import Metrics from '../../services/metrics';

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Log incoming request
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  // Intercept response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal
    };

    // Record metrics
    Metrics.recordRequestLatency(duration, req.path, req.method);

    // Log response
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration,
      memoryDelta,
      userId: req.user?.id
    });

    res.send = originalSend;
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLoggingMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`${req.method} ${req.path}`, {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id
  });

  Metrics.incrementErrorCount(error.name || 'Unknown');

  next(error);
};
```

### 4. Create CloudWatch Dashboard

Create `deployment/cloudwatch-dashboard.ts`:

```typescript
import { CloudWatchClient, PutDashboardCommand } from '@aws-sdk/client-cloudwatch';

const client = new CloudWatchClient({ region: 'us-east-1' });

const dashboardBody = {
  widgets: [
    {
      type: 'metric',
      properties: {
        metrics: [
          ['AWS/ECS', 'CPUUtilization', { stat: 'Average' }],
          ['.', 'MemoryUtilization', { stat: 'Average' }]
        ],
        period: 300,
        stat: 'Average',
        region: 'us-east-1',
        title: 'ECS Service Metrics'
      }
    },
    {
      type: 'log',
      properties: {
        query: `
          fields @timestamp, @message, @duration
          | filter ispresent(@duration)
          | stats avg(@duration) as avg_duration by bin(5m)
        `,
        region: 'us-east-1',
        title: 'Request Duration'
      }
    },
    {
      type: 'metric',
      properties: {
        metrics: [
          ['blog', 'errors', { stat: 'Sum' }],
          ['.', 'cache.hits', { stat: 'Sum' }],
          ['.', 'cache.misses', { stat: 'Sum' }]
        ],
        period: 300,
        stat: 'Sum',
        region: 'us-east-1',
        title: 'Application Metrics'
      }
    }
  ]
};

export async function createDashboard() {
  const command = new PutDashboardCommand({
    DashboardName: 'blog-platform',
    DashboardBody: JSON.stringify(dashboardBody)
  });

  await client.send(command);
  console.log('Dashboard created');
}
```

### 5. Create Alerts

Create `deployment/cloudwatch-alarms.sh`:

```bash
#!/bin/bash

ALARM_EMAIL="ops@example.com"
SNS_TOPIC="arn:aws:sns:us-east-1:account:alerts"

# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name blog-api-cpu-high \
  --alarm-description "Alert when CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_TOPIC

# Error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name blog-api-errors-high \
  --alarm-description "Alert when error rate > 5%" \
  --metric-name errors \
  --namespace blog \
  --statistic Sum \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_TOPIC

# Database connection alarm
aws cloudwatch put-metric-alarm \
  --alarm-name blog-db-connections-high \
  --alarm-description "Alert when connections > 80" \
  --metric-name connections.active \
  --namespace blog \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_TOPIC
```

## ✅ Verification Checklist

- [ ] Logger configured and working
- [ ] Logs appear in CloudWatch
- [ ] Metrics are being recorded
- [ ] Dashboard displays correctly
- [ ] Metrics visible in CloudWatch
- [ ] Alarms configured
- [ ] Notifications sent on alerts
- [ ] Performance metrics collected
- [ ] Error tracking implemented
- [ ] Distributed tracing works

## 📚 Resources

- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Monitoring Best Practices](https://aws.amazon.com/blogs/mt/real-time-insights-using-amazon-cloudwatch-dashboards/)
