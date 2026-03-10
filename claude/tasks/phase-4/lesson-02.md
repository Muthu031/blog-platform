# Lesson 2: Caching Strategies

## 🎯 Goal
Implement effective caching strategies for different data types and access patterns.

## 📚 What You'll Learn
- Cache-aside pattern
- Write-through caching
- Invalidation strategies
- Cache warming

## 📋 Prerequisites
- Completed Phase 4 Lesson 1
- Redis integration working
- Database queries optimized

## 🛠️ Tasks

### 1. Implement Cache Service with Strategies

Create `backend/src/services/cacheStrategies.ts`:

```typescript
import { redis } from './redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CacheStrategies {
  /**
   * Cache-Aside Pattern: Check cache first, then DB
   */
  static async cacheAside<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache
    const cached = await redis.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from source
    const data = await fetcher();

    // Store in cache
    await redis.set(cacheKey, data, ttl);

    return data;
  }

  /**
   * Write-Through Pattern: Update cache and DB simultaneously
   */
  static async writeThrough<T>(
    cacheKey: string,
    dbUpdater: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Update database first
    const result = await dbUpdater();

    // Update cache
    await redis.set(cacheKey, result, ttl);

    return result;
  }

  /**
   * Cache organization data
   */
  static async getOrganizationWithCache(orgId: string) {
    return this.cacheAside(
      `org:${orgId}`,
      async () => {
        return prisma.organization.findUnique({
          where: { id: orgId },
          include: {
            members: {
              include: { user: true }
            }
          }
        });
      },
      3600 // 1 hour
    );
  }

  /**
   * Cache project data
   */
  static async getProjectWithCache(projectId: string) {
    return this.cacheAside(
      `project:${projectId}`,
      async () => {
        return prisma.project.findUnique({
          where: { id: projectId },
          include: {
            boards: {
              include: { columns: true }
            }
          }
        });
      },
      1800 // 30 minutes
    );
  }

  /**
   * Cache user data
   */
  static async getUserWithCache(userId: string) {
    return this.cacheAside(
      `user:${userId}`,
      async () => {
        return prisma.user.findUnique({
          where: { id: userId }
        });
      },
      3600
    );
  }

  /**
   * Cache list data (projects in org)
   */
  static async getOrgProjectsWithCache(orgId: string) {
    return this.cacheAside(
      `org:${orgId}:projects`,
      async () => {
        return prisma.project.findMany({
          where: { organizationId: orgId }
        });
      },
      1800
    );
  }

  /**
   * Invalidate related cache keys
   */
  static async invalidateOrganizationCache(orgId: string) {
    await Promise.all([
      redis.delete(`org:${orgId}`),
      redis.delete(`org:${orgId}:projects`),
      redis.deletePattern(`org:${orgId}:*`)
    ]);
  }

  static async invalidateProjectCache(projectId: string) {
    await Promise.all([
      redis.delete(`project:${projectId}`),
      redis.deletePattern(`project:${projectId}:*`)
    ]);
  }

  static async invalidateUserCache(userId: string) {
    await redis.delete(`user:${userId}`);
  }
}
```

### 2. Create Cached Route Handlers

Update `backend/src/modules/organizations/organization.controller.ts`:

```typescript
import { CacheStrategies } from '../../services/cacheStrategies';

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organization = await CacheStrategies.getOrganizationWithCache(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const organization = await CacheStrategies.writeThrough(
      `org:${req.params.id}`,
      async () => {
        return prisma.organization.update({
          where: { id: req.params.id },
          data: { name, description }
        });
      }
    );

    // Invalidate org projects cache
    await redis.delete(`org:${req.params.id}:projects`);

    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Implement Cache Warming

Create `backend/src/services/cacheWarmer.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { redis } from './redis';

const prisma = new PrismaClient();

export class CacheWarmer {
  /**
   * Warm cache on startup
   */
  static async warmCache() {
    console.log('Starting cache warming...');

    try {
      // Warm popular organizations
      const topOrgs = await prisma.organization.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      for (const org of topOrgs) {
        await redis.set(`org:${org.id}`, org, 3600);
      }

      console.log(`Warmed ${topOrgs.length} organizations`);

      // Warm user data
      const activeUsers = await prisma.user.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' }
      });

      for (const user of activeUsers) {
        await redis.set(`user:${user.id}`, user, 3600);
      }

      console.log(`Warmed ${activeUsers.length} users`);

      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  /**
   * Schedule periodic cache refresh
   */
  static scheduleRefresh(intervalMs: number = 3600000) {
    setInterval(() => {
      this.warmCache().catch(console.error);
    }, intervalMs);
  }
}
```

## ✅ Verification Checklist

- [ ] Cache-aside pattern works correctly
- [ ] Write-through pattern updates both cache and DB
- [ ] Organization data is cached
- [ ] Project data is cached
- [ ] User data is cached
- [ ] List data is cached
- [ ] Cache invalidation works
- [ ] Expired keys are removed
- [ ] Cache warming populates data
- [ ] Performance improved with caching

## 📚 Resources

- [Caching Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Redis Caching Strategies](https://redis.io/docs/manual/client-side-caching/)
- [Cache Invalidation](https://martinfowler.com/bliki/CacheAsidePattern.html)
