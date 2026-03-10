# Lesson 1: Redis Integration

## 🎯 Goal
Set up Redis as caching and data structure server for performance optimization.

## 📚 What You'll Learn
- Install and configure Redis
- Set up Redis client
- Implement session storage
- Create cache initialization

## 📋 Prerequisites
- Completed Phase 3
- Backend server running
- Docker or Redis installed locally

## 🛠️ Tasks

### 1. Install Redis

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:latest

# Or install locally (macOS)
brew install redis
redis-server

# Or install locally (Windows)
# Download from https://github.com/microsoftarchive/redis/releases
```

### 2. Install Node Redis Client

```bash
cd backend
npm install redis ioredis
npm install -D @types/redis
```

### 3. Create Redis Client

Create `backend/src/services/redis.ts`:

```typescript
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

export class RedisService {
  private redis: Redis;
  private keyPrefix = 'saas:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.keyPrefix + key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.set(
        this.keyPrefix + key,
        JSON.stringify(value),
        'EX',
        ttl
      );
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.keyPrefix + key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  /**
   * Clear all keys with pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.keyPrefix + pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis deletePattern error:', error);
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(this.keyPrefix + key);
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  /**
   * Push to list
   */
  async push(key: string, value: any): Promise<number> {
    try {
      return await this.redis.rpush(this.keyPrefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Redis push error:', error);
      return 0;
    }
  }

  /**
   * Get list range
   */
  async getList(key: string, start: number = 0, stop: number = -1): Promise<any[]> {
    try {
      const data = await this.redis.lrange(this.keyPrefix + key, start, stop);
      return data.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Redis getList error:', error);
      return [];
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const redis = new RedisService();
```

### 4. Update Environment Variables

Add to `.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_TTL=3600
```

### 5. Create Cache Middleware

Create `backend/src/shared/middleware/cache.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { redis } from '../../services/redis';

export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}`;

    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }
    } catch (error) {
      console.error('Cache check error:', error);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      redis.set(cacheKey, data, ttl).catch(console.error);
      return originalJson(data);
    };

    next();
  };
};
```

### 6. Set Up Session Storage with Redis

Create `backend/src/services/session.ts`:

```typescript
import { redis } from './redis';

export class SessionService {
  async createSession(userId: string, data: any, ttl: number = 86400) {
    const sessionId = `session:${userId}:${Date.now()}`;
    await redis.set(sessionId, data, ttl);
    return sessionId;
  }

  async getSession(sessionId: string) {
    return redis.get(sessionId);
  }

  async deleteSession(sessionId: string) {
    await redis.delete(sessionId);
  }

  async getAllUserSessions(userId: string) {
    return redis.getList(`user_sessions:${userId}`);
  }

  async invalidateAllUserSessions(userId: string) {
    await redis.deletePattern(`session:${userId}:*`);
  }
}

export const sessionService = new SessionService();
```

## ✅ Verification Checklist

- [ ] Redis server is running
- [ ] Redis client connects successfully
- [ ] Get/set operations work
- [ ] TTL expiration works
- [ ] Pattern deletion works correctly
- [ ] List operations work
- [ ] Cache middleware intercepts responses
- [ ] Cached data is retrieved correctly
- [ ] Sessions can be created and retrieved
- [ ] Connection error handling works

## 📚 Resources

- [Redis Documentation](https://redis.io/docs/)
- [ioredis GitHub](https://github.com/luin/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/client-side-caching/)
