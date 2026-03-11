# Caching Strategies - Speed Up Your System with Redis

> Master multi-level caching, invalidation patterns, and distributed caching with Redis

## 1. Core Concepts

### Caching Layers

```
User Request
    ↓
L1: Browser Cache (static assets)
    ↓ (miss)
L2: CDN Cache (global edge servers)
    ↓ (miss)
L3: Application Memory Cache (in-process)
    ↓ (miss)
L4: Redis Cache (distributed)
    ↓ (miss)
L5: Database (source of truth)
    ↓ (compute)
Response (all layers updated on way back)
```

## 2. Real-World Applications

### Example 1: Multi-Level Caching

```typescript
class CacheManager {
  private memory = new Map<string, any>();
  
  async get<T>(key: string): Promise<T | null> {
    // L1: Check memory (fastest, instant)
    if (this.memory.has(key)) {
      return this.memory.get(key);
    }
    
    // L2: Check Redis (fast, ~1-5ms)
    const cached = await this.redis.get(key);
    if (cached) {
      const value = JSON.parse(cached);
      this.memory.set(key, value); // Warm memory cache
      return value;
    }
    
    // L3: Fetch from database and populate caches
    return null;
  }
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Update all layers
    this.memory.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(key: string): Promise<void> {
    // Remove from all layers
    this.memory.delete(key);
    await this.redis.delete(key);
  }
}
```

### Example 2: Cache Invalidation Patterns

```typescript
// Pattern 1: Time-based expiration
class TimeBasedCaching {
  async getCachedTask(taskId: string): Promise<Task> {
    const cacheKey = `task:${taskId}`;
    
    // Check cache
    let task = await this.cache.get<Task>(cacheKey);
    if (task) return task;
    
    // Cache miss - fetch from DB
    task = await db.task.findUnique({ where: { id: taskId } });
    
    // Cache for 5 minutes
    // After 5 minutes, cache expires automatically (no action needed)
    await this.cache.setex(cacheKey, 300, JSON.stringify(task));
    
    return task;
  }
}

// Pattern 2: Event-based invalidation (Proper invalidation)
class EventBasedCaching {
  async updateTask(taskId: string, updates: any): Promise<Task> {
    const task = await db.task.update({
      where: { id: taskId },
      data: updates
    });
    
    // Invalidate cache immediately
    await this.cache.delete(`task:${taskId}`);
    
    // Invalidate related caches
    await this.cache.delete(`project:${task.projectId}:tasks`);
    await this.cache.delete(`org:${task.organizationId}:statistics`);
    
    // Publish event for other services
    await this.eventBus.publish({
      type: 'TaskUpdated',
      data: task
    });
    
    return task;
  }
}

// Pattern 3: Cache-Aside Pattern
class CacheAsidePattern {
  async getTask(taskId: string): Promise<Task> {
    const key = `task:${taskId}`;
    
    // 1. Try cache first
    let task = await this.cache.get<Task>(key);
    
    if (!task) {
      // 2. Cache miss - fetch from database
      task = await db.task.findUnique({ where: { id: taskId } });
      
      if (task) {
        // 3. Store in cache
        await this.cache.setex(key, 3600, JSON.stringify(task));
      }
    }
    
    return task;
  }
}

// Pattern 4: Write-Through Pattern
class WriteThroughPattern {
  async updateTask(taskId: string, updates: any): Promise<Task> {
    // 1. Update database first
    const task = await db.task.update({
      where: { id: taskId },
      data: updates
    });
    
    // 2. Update cache immediately (synchronously)
    const key = `task:${taskId}`;
    await this.cache.setex(key, 3600, JSON.stringify(task));
    
    return task;
    // If cache write fails, whole operation fails (strong consistency)
  }
}

// Pattern 5: Write-Behind Pattern (Best for write-heavy)
class WriteBehindPattern {
  async updateTask(taskId: string, updates: any): Promise<Task> {
    // 1. Update cache first (fast)
    const key = `task:${taskId}`;
    const task = { id: taskId, ...updates };
    await this.cache.set(key, task, 3600);
    
    // 2. Queue database update (asynchronous)
    await this.updateQueue.enqueue({
      operation: 'UpdateTask',
      taskId,
      updates
    });
    
    return task;
    // Returns immediately, DB update happens later!
  }
  
  async processPendingUpdates(): Promise<void> {
    // Worker process
    const items = await this.updateQueue.dequeueMany(100);
    
    for (const item of items) {
      try {
        await db.task.update({
          where: { id: item.taskId },
          data: item.updates
        });
      } catch (error) {
        // Re-queue if failed
        await this.updateQueue.enqueue(item);
      }
    }
  }
}
```

### Example 3: Redis Data Structures

```typescript
class RedisDataStructures {
  // Strings (simple caching)
  async cacheUserProfile(userId: string): Promise<void> {
    const user = await db.user.findUnique({ where: { id: userId } });
    await this.redis.setex(
      `user:${userId}`,
      3600,
      JSON.stringify(user)
    );
  }
  
  // Hashes (object caching without serialization)
  async cacheTaskFields(taskId: string): Promise<void> {
    const task = await db.task.findUnique({ where: { id: taskId } });
    
    await this.redis.hset(`task:${taskId}`, {
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId
    });
    
    // Fetch individual fields efficiently
    const status = await this.redis.hget(`task:${taskId}`, 'status');
  }
  
  // Lists (queues, recent items)
  async trackRecentTasks(organizationId: string): Promise<void> {
    const task = await db.task.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Keep 100 most recent
    await this.redis.lpush(`org:${organizationId}:recent_tasks`, task.id);
    await this.redis.ltrim(`org:${organizationId}:recent_tasks`, 0, 99);
  }
  
  async getRecentTasks(organizationId: string): Promise<string[]> {
    return this.redis.lrange(`org:${organizationId}:recent_tasks`, 0, 9);
  }
  
  // Sets (membership, unique items)
  async cacheOrgMembers(organizationId: string): Promise<void> {
    const members = await db.user.findMany({
      where: { organizationId },
      select: { id: true }
    });
    
    await this.redis.sadd(
      `org:${organizationId}:members`,
      ...members.map(m => m.id)
    );
  }
  
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    return this.redis.sismember(`org:${organizationId}:members`, userId) === 1;
  }
  
  // Sorted Sets (leaderboards, rankings, priority queues)
  async updateLeaderboard(organizationId: string, userId: string, score: number): Promise<void> {
    await this.redis.zadd(
      `leaderboard:${organizationId}`,
      score,
      userId
    );
  }
  
  async getTopUsers(organizationId: string, limit: number = 10): Promise<User[]> {
    const userIds = await this.redis.zrevrange(
      `leaderboard:${organizationId}`,
      0,
      limit - 1
    );
    
    return db.user.findMany({ where: { id: { in: userIds } } });
  }
  
  // Bitmaps (fast counters, presence tracking)
  async trackDailyActiveUsers(organizationId: string, userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.redis.setbit(`dau:${organizationId}:${today}`, parseInt(userId), 1);
  }
  
  async countDailyActiveUsers(organizationId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    return this.redis.bitcount(`dau:${organizationId}:${today}`);
  }
}
```

### Example 4: Distributed Caching with Redis Cluster

```typescript
// Redis Cluster for high availability
class RedisCached Service {
  private redis: RedisClusterClient;
  
  constructor() {
    this.redis = new RedisClusterClient({
      nodes: [
        { host: 'redis-1', port: 6379 },
        { host: 'redis-2', port: 6379 },
        { host: 'redis-3', port: 6379 }
      ],
      options: {
        enableReadyCheck: true,
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100
      }
    });
  }
  
  async getWithFallback<T>(key: string, fallback: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      // Redis cluster node failed, fallback to database
      console.warn('Redis unavailable, using database:', error);
    }
    
    // Get from source
    const value = await fallback();
    
    // Try to cache (best effort)
    try {
      await this.redis.setex(key, 3600, JSON.stringify(value));
    } catch {
      // Ignore cache write failures
    }
    
    return value;
  }
}
```

### Example 5: Cache Warming

```typescript
class CacheWarming {
  async prewarmCache(): Promise<void> {
    const organizations = await db.organization.findMany();
    
    for (const org of organizations) {
      // Pre-load frequently accessed data
      
      // 1. Recent tasks
      const recentTasks = await db.task.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      
      for (const task of recentTasks) {
        await this.cache.setex(
          `task:${task.id}`,
          3600,
          JSON.stringify(task)
        );
      }
      
      // 2. Organization stats
      const stats = await db.task.aggregate({
        where: { organizationId: org.id },
        _count: true,
        _avg: { priority: true }
      });
      
      await this.cache.setex(
        `org:${org.id}:stats`,
        3600,
        JSON.stringify(stats)
      );
    }
  }
  
  // Run every 6 hours
  async scheduleWarming(): Promise<void> {
    setInterval(
      () => this.prewarmCache(),
      6 * 60 * 60 * 1000
    );
  }
}
```

## 3. Cache Monitoring

```typescript
class CacheMonitoring {
  async trackMetrics(): Promise<void> {
    setInterval(async () => {
      const info = await this.redis.info('stats');
      
      const metrics = {
        hitRate: this.calculateHitRate(),
        evictions: info.evicted_keys,
        memoryUsage: info.used_memory,
        cacheSize: await this.redis.dbsize()
      };
      
      // Alert if hit rate is low
      if (metrics.hitRate < 0.8) {
        console.warn('Low cache hit rate:', metrics.hitRate);
      }
      
      // Alert if memory is full
      if (metrics.memoryUsage > maxMemory * 0.9) {
        console.warn('Redis memory nearly full');
      }
    }, 60000);
  }
}
```

## 12. Practical Exercise

### Build a Comprehensive Caching System

**Requirements:**
1. Implement multi-level caching
2. Create cache invalidation strategies
3. Use Redis data structures effectively
4. Handle cache failures gracefully
5. Monitor cache performance

### Structure

```typescript
class CachingSystem {
  async setupMultiLevelCache(): Promise<void> {
    // TODO: Memory + Redis cache
  }
  
  async implementInvalidation(): Promise<void> {
    // TODO: Event-based cache invalidation
  }
  
  async useRedisEffectively(): Promise<void> {
    // TODO: Leverage different data structures
  }
  
  async handleCacheFailure(): Promise<void> {
    // TODO: Graceful degradation
  }
}
```

---

## Next Lesson

Continue to [Async Processing & Queues](07-async-processing-queues.md)
