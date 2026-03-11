# Monitoring & Observability - Knowing What's Happening in Production

> Logging, APM, distributed tracing, and meaningful alerting

## 1. Core Concepts

### Three Pillars of Observability

```
Metrics (What)          Logs (How)          Traces (Why)
├─ Response time        ├─ Error messages    ├─ Request flow
├─ Error rates          ├─ Stack traces      ├─ Latency breakdown
├─ CPU usage            ├─ User actions      ├─ Dependencies
├─ Memory usage         ├─ System events     └─ Failures
└─ Queue length         └─ Debug info
```

## 2. Real-World Applications

### Example 1: Structured Logging

```typescript
import winston from 'winston';

class Logger {
  private logger = winston.createLogger({
    format: winston.format.json(),
    defaultMeta: { service: 'task-api' },
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
  
  // ❌ BAD: Unstructured logging
  badLog(error: any): void {
    console.log('Error happened: ' + error.message);
  }
  
  // ✅ GOOD: Structured logging
  log(level: 'info' | 'error' | 'warn', message: string, meta?: any): void {
    this.logger.log(level, message, {
      timestamp: new Date(),
      ...meta
    });
  }
  
  // Usage
  async createTask(data: any): Promise<void> {
    try {
      const task = await db.task.create({ data });
      
      this.log('info', 'Task created', {
        taskId: task.id,
        organizationId: task.organizationId,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.log('error', 'Failed to create task', {
        error: error.message,
        stack: error.stack,
        input: data
      });
    }
  }
  
  // Query logging
  logQuery(sql: string, params: any[], duration: number): void {
    if (duration > 100) {
      this.log('warn', 'Slow query', {
        sql,
        params,
        duration,
        severity: 'warning'
      });
    }
  }
  
  // Request logging middleware
  requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      this.log('info', 'HTTP request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: req.user?.id,
        ip: req.ip
      });
    });
    
    next();
  }
}
```

### Example 2: Application Performance Monitoring (APM)

```typescript
import apm from 'elastic-apm-node';

class APMService {
  async trackTransaction(name: string, fn: () => Promise<any>): Promise<any> {
    const transaction = apm.startTransaction(name, 'request');
    
    try {
      const result = await fn();
      transaction.setOutcome('success');
      return result;
    } catch (error) {
      transaction.setOutcome('failure');
      throw error;
    } finally {
      transaction.end();
    }
  }
  
  async trackQueryPerformance(sql: string): Promise<any> {
    const span = apm.startSpan('database.query');
    span?.setLabel('sql', sql);
    
    try {
      const start = Date.now();
      const result = await db.$queryRawUnsafe(sql);
      const duration = Date.now() - start;
      
      span?.setLabel('duration', duration);
      
      if (duration > 100) {
        apm.captureMessage('Slow query detected', 'warning');
      }
      
      return result;
    } finally {
      span?.end();
    }
  }
  
  // Real-world metrics
  trackMetrics(): void {
    setInterval(() => {
      apm.getMetricsCollector().collect({
        'memory.heap.used': process.memoryUsage().heapUsed,
        'memory.heap.total': process.memoryUsage().heapTotal,
        'system.cpu.usage': process.cpuUsage()
      });
    }, 10000);
  }
}
```

### Example 3: Distributed Tracing

```typescript
import { trace, context } from '@opentelemetry/api';

class DistributedTracing {
  private tracer = trace.getTracer('task-service');
  
  async createTaskWithTracing(data: CreateTaskData): Promise<Task> {
    return this.tracer.startActiveSpan('create.task', async (span) => {
      span.setAttributes({
        'task.title': data.title,
        'task.organizationId': data.organizationId
      });
      
      try {
        // Validate
        const validationSpan = this.tracer.startSpan('validate.task');
        this.validateTask(data);
        validationSpan.end();
        
        // Create in database
        const dbSpan = this.tracer.startSpan('db.create');
        const task = await db.task.create({ data });
        dbSpan.end();
        
        // Send notification
        const notificationSpan = this.tracer.startSpan('send.notification');
        await this.notificationService.notifyTeam(task);
        notificationSpan.end();
        
        span.setStatus({ code: 0 }); // OK
        return task;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2 }); // FAILED
        throw error;
      }
    });
  }
}
```

### Example 4: Metrics Collection

```typescript
import prometheus from 'prom-client';

class MetricsCollection {
  private requestDuration = new prometheus.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code']
  });
  
  private activeConnections = new prometheus.Gauge({
    name: 'active_connections',
    help: 'Number of active database connections'
  });
  
  private errorCount = new prometheus.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'endpoint']
  });
  
  metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      this.requestDuration
        .labels(req.method, req.path, res.statusCode)
        .observe(duration);
    });
    
    next();
  }
  
  trackDatabaseConnections(count: number): void {
    this.activeConnections.set(count);
  }
  
  trackError(type: string, endpoint: string): void {
    this.errorCount.labels(type, endpoint).inc();
  }
  
  // Expose metrics endpoint for Prometheus
  exposMetrics(app: Express): void {
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', prometheus.register.contentType);
      res.end(await prometheus.register.metrics());
    });
  }
}
```

### Example 5: Alerting

```typescript
class AlertingService {
  async setupAlerts(): Promise<void> {
    // Alert: High error rate
    setInterval(async () => {
      const errors = await this.getErrorRatePercent();
      
      if (errors > 5) {
        await this.sendAlert({
          severity: 'critical',
          message: `High error rate: ${errors}%`,
          details: { errorRate: errors }
        });
      }
    }, 60000);
    
    // Alert: Slow API
    setInterval(async () => {
      const p99Latency = await this.getP99Latency();
      
      if (p99Latency > 1000) {
        await this.sendAlert({
          severity: 'warning',
          message: `High API latency: ${p99Latency}ms`,
          details: { p99: p99Latency }
        });
      }
    }, 60000);
    
    // Alert: Database query
    setInterval(async () => {
      const slowQueries = await this.getSlowQueries();
      
      if (slowQueries > 10) {
        await this.sendAlert({
          severity: 'warning',
          message: `${slowQueries} slow queries detected`,
          details: { count: slowQueries }
        });
      }
    }, 60000);
  }
  
  private async sendAlert(alert: Alert): Promise<void> {
    // Send to Slack
    await slack.post('#alerts', {
      text: alert.message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.severity.toUpperCase()}*\\n${alert.message}`
          }
        }
      ]
    });
    
    // Also send email for critical
    if (alert.severity === 'critical') {
      await emailService.send({
        to: 'oncall@example.com',
        subject: `ALERT: ${alert.message}`,
        body: JSON.stringify(alert.details, null, 2)
      });
    }
  }
}
```

### Example 6: Custom Dashboards

```typescript
// Grafana Dashboard JSON
const dashboardConfig = {
  panels: [
    {
      title: 'Request Rate',
      targets: [
        {
          expr: 'rate(http_request_duration_ms_count[5m])'
        }
      ]
    },
    {
      title: 'Error Rate',
      targets: [
        {
          expr: 'rate(errors_total[5m])'
        }
      ]
    },
    {
      title: 'Database Connections',
      targets: [
        {
          expr: 'active_connections'
        }
      ]
    },
    {
      title: 'P99 Latency',
      targets: [
        {
          expr: 'histogram_quantile(0.99, http_request_duration_ms_bucket)'
        }
      ]
    }
  ]
};
```

## 3. Health Checks

```typescript
class HealthCheck {
  async health(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: await this.checkMemory(),
      api: 'healthy'
    };
    
    const unhealthy = Object.values(checks).filter(v => v !== 'healthy');
    
    return {
      status: unhealthy.length > 0 ? 'degraded' : 'healthy',
      checks,
      timestamp: new Date()
    };
  }
  
  private async checkDatabase(): Promise<string> {
    try {
      await db.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }
  
  private async checkRedis(): Promise<string> {
    try {
      await redis.ping();
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }
  
  private checkMemory(): string {
    const used = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    
    if (used > 0.9) return 'critical';
    if (used > 0.7) return 'degraded';
    return 'healthy';
  }
}
```

## 12. Practical Exercise

### Build Complete Observability Stack

**Requirements:**
1. Structured logging with Winston
2. APM with transaction tracking
3. Distributed tracing
4. Prometheus metrics
5. Grafana dashboards
6. Slack alerting

### Structure

```typescript
class ObservabilityStack {
  async setupLogging(): Promise<void> {
    // TODO: Winston configuration
  }
  
  async setupAPM(): Promise<void> {
    // TODO: Elastic APM
  }
  
  async setupTracing(): Promise<void> {
    // TODO: OpenTelemetry
  }
  
  async setupMetrics(): Promise<void> {
    // TODO: Prometheus
  }
  
  async setupAlerting(): Promise<void> {
    // TODO: Slack alerts
  }
}
```

---

## Next Lesson

Continue to [CI/CD & Deployment](06-cicd-deployment.md)
