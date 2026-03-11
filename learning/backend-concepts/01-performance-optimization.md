# Performance Optimization - Making Your Backend Fast

> Profile, benchmark, and optimize your code to handle millions of requests

## 1. Core Concepts

### Performance Metrics

```
Response Time Goals:
- Static assets: <50ms
- API endpoints: <100ms
- Database queries: <10ms (with index)
- Cache lookups: <1ms

Throughput Goals:
- Single server: 1,000-10,000 reqs/sec
- Auto-scaled system: 1M+ reqs/sec

Resource Usage:
- Memory: <500MB per instance
- CPU: <50% average (headroom for spikes)
```

## 2. Real-World Applications

### Example 1: Profiling with Node.js

```typescript
class PerformanceProfiler {
  async profileRequest(endpoint: string): Promise<void> {
    const start = process.hrtime.bigint();
    const memBefore = process.memoryUsage().heapUsed;
    
    // Execute endpoint
    const response = await fetch(`http://localhost:3000${endpoint}`);
    
    const end = process.hrtime.bigint();
    const memAfter = process.memoryUsage().heapUsed;
    
    const timeMs = Number(end - start) / 1_000_000;
    const memUsed = (memAfter - memBefore) / 1024 / 1024;
    
    console.log(`
      Endpoint: ${endpoint}
      Time: ${timeMs.toFixed(2)}ms
      Memory: ${memUsed.toFixed(2)}MB
      Status: ${response.status}
    `);
  }
  
  // Use Node.js v8 profiler
  async captureSnapshot(): Promise<void> {
    const v8 = require('v8');
    const fs = require('fs');
    
    // Generate heap snapshot
    v8.writeHeapSnapshot(`./heap-${Date.now()}.heapsnapshot`);
    console.log('Heap snapshot saved');
    
    // Analyze with Chrome DevTools
  }
}
```

### Example 2: Benchmarking with autocannon

```typescript
import autocannon from 'autocannon';

class LoadTester {
  async benchmarkEndpoint(url: string): Promise<void> {
    const result = await autocannon({
      url,
      connections: 100,
      duration: 30
    });
    
    console.log(`
      Requests/sec: ${result.requests.mean}
      Latency: ${result.latency.mean}ms
      P99: ${result.latency.p99}ms
      Errors: ${result.errors}
    `);
  }
}
```

### Example 3: Identifying N+1 Queries

```typescript
// ❌ BAD: N+1 Query Problem
class N_Plus_1_Example {
  async getProjectWithTasks_Slow(projectId: string): Promise<ProjectWithTasks> {
    // Query 1: Get project
    const project = await db.project.findUnique({
      where: { id: projectId }
    });
    
    // Query N: Get tasks (one per... wait, just one query)
    const tasks = await db.task.findMany({
      where: { projectId }
    });
    
    // But if we do this in a loop...
    const projects = await db.project.findMany({ take: 100 });
    
    for (const proj of projects) {
      // Query for each project = N queries!
      const projTasks = await db.task.findMany({
        where: { projectId: proj.id }
      });
    }
    
    // Total: 1 + 100 = 101 queries!
  }
  
  // ✅ GOOD: Single query with JOIN
  async getProjectWithTasks_Fast(projectId: string): Promise<ProjectWithTasks> {
    return db.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: true // Uses JOIN - single query!
      }
    });
  }
  
  // ✅ GOOD: Use Promise.all for parallel queries
  async getMultipleProjects_Optimized(projectIds: string[]): Promise<ProjectWithTasks[]> {
    const [projects, tasks] = await Promise.all([
      db.project.findMany({
        where: { id: { in: projectIds } }
      }),
      db.task.findMany({
        where: { projectId: { in: projectIds } }
      })
    ]);
    
    // Group tasks by project (no additional queries)
    const tasksByProject = new Map<string, Task[]>();
    for (const task of tasks) {
      const list = tasksByProject.get(task.projectId) || [];
      list.push(task);
      tasksByProject.set(task.projectId, list);
    }
    
    return projects.map(proj => ({
      ...proj,
      tasks: tasksByProject.get(proj.id) || []
    }));
  }
}
```

### Example 4: Memory Leak Detection

```typescript
class MemoryOptimization {
  // ❌ MEMORY LEAK: Growing Map
  private userCache = new Map<string, User>();
  
  async cacheUser(userId: string): Promise<void> {
    const user = await this.fetchUser(userId);
    this.userCache.set(userId, user); // Never evicted!
  }
  
  // ✅ FIXED: LRU Cache with max size
  async setupLRUCache(maxSize: number): Promise<void> {
    const cache = new LRUCache<string, User>({ max: maxSize });
    
    // Now old items are automatically removed
    cache.set(userId, user);
  }
  
  // ✅ FIXED: Use Set instead of Map if you don't need values
  private userIds = new Set<string>();
  
  // ✅ FIXED: Clear references
  async cleanup(): Promise<void> {
    // Remove references to allow garbage collection
    this.userCache.clear();
    this.userIds.clear();
  }
}
```

### Example 5: Query Optimization

```typescript
class QueryOptimization {
  async slowQuery(): Promise<Task[]> {
    // ❌ SLOW: Select all columns, not needed
    const tasks = await db.$queryRaw`
      SELECT * FROM tasks
      WHERE status = 'done'
      LIMIT 100;
    `;
    
    return tasks;
  }
  
  async fastQuery(): Promise<Task[]> {
    // ✅ FAST: Select only needed columns
    const tasks = await db.$queryRaw`
      SELECT id, title, status FROM tasks
      WHERE status = 'done'
      LIMIT 100;
    `;
    
    return tasks;
  }
  
  async parallelQueries(): Promise<void> {
    // ✅ Run independent queries in parallel
    const [tasks, projects, users] = await Promise.all([
      db.task.findMany({ take: 50 }),
      db.project.findMany({ take: 50 }),
      db.user.findMany({ take: 50 })
    ]);
  }
  
  async useDataloader(): Promise<void> {
    // ✅ Batch requests to database
    const loader = new DataLoader(async (userIds: string[]) => {
      return db.user.findMany({
        where: { id: { in: userIds } }
      });
    });
    
    // These batched requests will be combined
    const user1 = await loader.load('user1');
    const user2 = await loader.load('user2');
    // Single database query for both!
  }
}
```

### Example 6: Connection Pooling

```typescript
class ConnectionPooling {
  private pool: PrismaClient;
  
  constructor() {
    this.pool = new PrismaClient({
      datasources: {
        db: {
          url: `${process.env.DATABASE_URL}?connection_limit=20`
        }
      },
      log: [
        {
          emit: 'event',
          level: 'query'
        }
      ]
    });
    
    // Log slow queries
    this.pool.$on('query', (e) => {
      if (e.duration > 100) {
        console.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }
}
```

### Example 7: Caching Hot Data

```typescript
class CachingStrategy {
  async getCachedUser(userId: string): Promise<User> {
    // L1: Memory cache (fastest)
    if (this.memoryCache.has(userId)) {
      return this.memoryCache.get(userId)!;
    }
    
    // L2: Redis (fast)
    const cached = await this.redis.get(`user:${userId}`);
    if (cached) {
      const user = JSON.parse(cached);
      this.memoryCache.set(userId, user);
      return user;
    }
    
    // L3: Database (slow)
    const user = await db.user.findUnique({ where: { id: userId } });
    
    // Populate caches
    this.memoryCache.set(userId, user);
    await this.redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
    
    return user;
  }
}
```

## 3. Benchmarking Results

```typescript
class BenchmarkComparison {
  async compareMethods(): Promise<void> {
    const methods = {
      'Sequential queries': () => this.sequentialQueries(),
      'Parallel queries': () => this.parallelQueries(),
      'With caching': () => this.withCaching(),
      'With batch loading': () => this.withBatchLoading()
    };
    
    for (const [name, method] of Object.entries(methods)) {
      const start = Date.now();
      await method();
      const duration = Date.now() - start;
      
      console.log(`${name}: ${duration}ms`);
    }
    
    // Results:
    // Sequential queries: 500ms
    // Parallel queries: 200ms
    // With caching: 50ms
    // With batch loading: 150ms
  }
}
```

## 12. Practical Exercise

### Requirements
1. Profile your API endpoints
2. Identify slow queries
3. Implement caching
4. Benchmark improvements
5. Monitor memory usage

### Structure

```typescript
class PerformanceOptimizer {
  async profileEndpoints(): Promise<void> {
    // TODO: Use profiling tools
  }
  
  async findSlowQueries(): Promise<void> {
    // TODO: EXPLAIN ANALYZE
  }
  
  async implementCaching(): Promise<void> {
    // TODO: Add caching layers
  }
  
  async benchmarkImprovements(): Promise<void> {
    // TODO: Measure improvements
  }
}
```

---

## Next Lesson

Continue to [API Design & Best Practices](02-api-design-best-practices.md)
