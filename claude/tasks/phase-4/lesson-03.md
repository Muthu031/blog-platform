# Lesson 3: Rate Limiting

## 🎯 Goal
Implement rate limiting to prevent abuse and ensure API stability.

## 📚 What You'll Learn
- Token bucket algorithm
- Sliding window rate limiting
- Per-user and per-endpoint limits
- Handle rate limit responses

## 📋 Prerequisites
- Completed Phase 4 Lessons 1-2
- Redis working
- Express server running

## 🛠️ Tasks

### 1. Install Rate Limiting Package

```bash
cd backend
npm install express-rate-limit
```

### 2. Create Redis-Based Rate Limiter

Create `backend/src/services/rateLimiter.ts`:

```typescript
import { redis } from './redis';

export class RateLimiter {
  /**
   * Token bucket algorithm
   */
  static async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const now = Date.now();
    const windowKey = `rate:${key}`;
    const countKey = `${windowKey}:count`;
    const resetKey = `${windowKey}:reset`;

    const reset = await redis.redis.get(resetKey);
    const resetTime = reset ? parseInt(reset) : now + windowSeconds * 1000;

    if (now > resetTime) {
      // Window expired, reset
      await redis.redis
        .pipeline()
        .set(countKey, '0')
        .set(resetKey, (now + windowSeconds * 1000).toString())
        .exec();

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetIn: windowSeconds
      };
    }

    const current = await redis.redis.incr(countKey);

    if (current === 1) {
      await redis.redis.expire(countKey, windowSeconds);
    }

    const remaining = Math.max(0, maxRequests - current);
    const resetInSeconds = Math.ceil((resetTime - now) / 1000);

    return {
      allowed: current <= maxRequests,
      remaining,
      resetIn: resetInSeconds
    };
  }

  /**
   * Sliding window rate limiter
   */
  static async checkSlidingWindow(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; count: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const windowKey = `sliding:${key}`;

    // Remove old entries
    await redis.redis.zremrangebyscore(windowKey, 0, windowStart);

    // Count requests in window
    const count = await redis.redis.zcard(windowKey);

    if (count < maxRequests) {
      // Add new request
      await redis.redis.zadd(windowKey, now, `${now}-${Math.random()}`);
      await redis.redis.expire(windowKey, windowSeconds);

      return { allowed: true, count: count + 1 };
    }

    return { allowed: false, count };
  }
}
```

### 3. Create Rate Limit Middleware

Create `backend/src/shared/middleware/rateLimit.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../../services/rateLimiter';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : req.ip;

      const result = await RateLimiter.checkRateLimit(
        key,
        config.maxRequests,
        config.windowSeconds
      );

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetIn);

      if (!result.allowed) {
        return res.status(429).json({
          error: config.message || 'Too many requests',
          retryAfter: result.resetIn
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next(); // Continue on error to avoid blocking traffic
    }
  };
};

/**
 * Global rate limiter
 */
export const globalRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowSeconds: 15 * 60, // 15 minutes
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

/**
 * Auth endpoints rate limiter (stricter)
 */
export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 15 * 60,
  message: 'Too many login attempts',
  keyGenerator: (req) => {
    return `auth:${req.body.email || req.ip}`;
  }
});

/**
 * API endpoints rate limiter
 */
export const apiRateLimiter = createRateLimiter({
  maxRequests: 1000,
  windowSeconds: 60 * 60, // 1 hour
  keyGenerator: (req) => {
    return `api:${req.user?.id || req.ip}`;
  }
});

/**
 * Search endpoints rate limiter
 */
export const searchRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowSeconds: 60, // 1 minute
  keyGenerator: (req) => {
    return `search:${req.user?.id || req.ip}`;
  }
});
```

### 4. Apply Rate Limiters to Routes

Update `backend/src/app.ts`:

```typescript
import {
  globalRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  searchRateLimiter
} from './shared/middleware/rateLimit';

// Global rate limiter
app.use(globalRateLimiter);

// Auth routes with strict limiting
app.use('/api/auth', authRateLimiter);

// API routes
app.use('/api', apiRateLimiter);

// Search endpoint
app.get('/api/search', searchRateLimiter, searchHandler);
```

## ✅ Verification Checklist

- [ ] Token bucket rate limiting works
- [ ] Sliding window algorithm functions correctly
- [ ] Rate limit headers are sent
- [ ] 429 status returned when limit exceeded
- [ ] Per-user rate limiting works
- [ ] Per-endpoint rate limiting works
- [ ] Auth endpoints have stricter limits
- [ ] Rate limits reset correctly
- [ ] Window expiration works
- [ ] Error handling prevents crashes

## 📚 Resources

- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Token_bucket)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [API Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
