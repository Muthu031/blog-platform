# Lesson 5: Performance Testing

## 🎯 Goal
Implement performance testing to identify and optimize bottlenecks.

## 📚 What You'll Learn
- Load testing with Artillery
- Performance benchmarking
- Memory profiling
- Query optimization verification

## 📋 Prerequisites
- Completed Phase 7 Lessons 1-4
- Application deployed
- Load testing tools installed

## 🛠️ Tasks

### 1. Install Performance Testing Tools

```bash
npm install --save-dev artillery typescript-benchmark
npm install clinic
```

### 2. Create Load Test Configuration

Create `performance/load-test.yml`:

```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 5
      rampTo: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Steady state"
    - duration: 60
      arrivalRate: 20
      rampTo: 50
      name: "Ramp up"
    - duration: 60
      arrivalRate: 50
      name: "Sustained high load"

scenarios:
  - name: "User Authentication Flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: '$.token'
              as: 'authToken'

  - name: "Task Board Access"
    flow:
      - get:
          url: "/api/projects/1/board"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Create Task"
    flow:
      - post:
          url: "/api/projects/1/columns/col1/tasks"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            title: "Performance test task"
            description: "Testing performance"

  - name: "Get Tasks with Pagination"
    flow:
      - get:
          url: "/api/projects/1/tasks?page=1&limit=50"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

### 3. Create Performance Benchmarks

Create `backend/src/__tests__/performance.benchmark.ts`:

```typescript
import { Suite } from 'benchmark';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Performance Benchmarks', () => {
  it('should benchmark query performance', async () => {
    const suite = new Suite('Task Queries');

    suite
      .add('Find tasks with includes',async () => {
        await prisma.task.findMany({
          where: { projectId: 'test-project' },
          include: {
            assignee: true,
            column: true
          }
        });
      })
      .add('Find tasks with select', async () => {
        await prisma.task.findMany({
          where: { projectId: 'test-project' },
          select: {
            id: true,
            title: true,
            assignee: true
          }
        });
      })
      .on('complete', function() {
        console.log('Fastest is ' + this.filter('fastest').map('name'));
      })
      .run({ async: true });
  });

  it('should benchmark cache performance', async () => {
    const suite = new Suite('Cache Performance');

    const testData = { id: '1', name: 'Test' };

    suite
      .add('Database query', async () => {
        await prisma.organization.findUnique({
          where: { id: '1' }
        });
      })
      .add('Cache hit', async () => {
        return testData; // Simulated cache hit
      })
      .on('complete', function() {
        const dbTime = this[0].times.elapsed;
        const cacheTime = this[1].times.elapsed;
        const improvement = ((dbTime - cacheTime) / dbTime * 100).toFixed(2);
        console.log(`Cache is ${improvement}% faster`);
      })
      .run({ async: true });
  });
});
```

### 4. Create Health Check Dashboard

Create `performance/health-check.ts`:

```typescript
import axios from 'axios';

interface HealthMetrics {
  responseTime: number;
  status: number;
  healthy: boolean;
  checks: {
    database: string;
    redis: string;
    timestamp: string;
  };
}

async function checkHealth(url: string): Promise<HealthMetrics> {
  const start = Date.now();

  try {
    const response = await axios.get(`${url}/health/deep`, {
      timeout: 5000
    });

    const responseTime = Date.now() - start;

    return {
      responseTime,
      status: response.status,
      healthy: response.status === 200,
      checks: response.data.checks
    };
  } catch (error) {
    return {
      responseTime: Date.now() - start,
      status: 0,
      healthy: false,
      checks: {
        database: 'failed',
        redis: 'failed',
        timestamp: new Date().toISOString()
      }
    };
  }
}

async function runHealthChecks(url: string, interval: number = 5000) {
  console.log('Starting health checks...');

  setInterval(async () => {
    const metrics = await checkHealth(url);

    console.log({
      timestamp: new Date().toISOString(),
      responseTime: `${metrics.responseTime}ms`,
      healthy: metrics.healthy,
      checks: metrics.checks
    });

    if (!metrics.healthy) {
      console.error('⚠️  Health check failed!');
    }
  }, interval);
}

runHealthChecks('http://localhost:3001');
```

### 5. Add Performance Scripts

Update `package.json`:

```json
{
  "scripts": {
    "perf:load-test": "artillery run performance/load-test.yml",
    "perf:benchmark": "jest --testMatch='**/*.benchmark.ts'",
    "perf:profile": "clinic doctor -- node dist/server.js",
    "perf:health": "ts-node performance/health-check.ts",
    "perf:report": "artillery run performance/load-test.yml --output performance/report.json && artillery report performance/report.json"
  }
}
```

### 6. Create Performance CI Check

Create `.github/workflows/performance.yml`:

```yaml
name: Performance Tests

on:
  push:
    branches: [ main ]

jobs:
  performance:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3

      - name: Run load tests
        run: npm run perf:load-test

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance/report.json
```

## ✅ Verification Checklist

- [ ] Load test configuration created
- [ ] Artillery runs successfully
- [ ] Performance benchmarks execute
- [ ] Response times measured
- [ ] Bottlenecks identified
- [ ] Memory profiling works
- [ ] Health checks pass
- [ ] Results can be compared
- [ ] Regression detected
- [ ] Performance improves with optimizations

## 📚 Resources

- [Artillery.io Documentation](https://artillery.io/)
- [Performance Testing](https://www.loadimpact.com/blog/load-testing-approaches-best-practices/)
- [Node.js Performance Profiling](https://nodejs.org/en/docs/guides/simple-profiling/)
