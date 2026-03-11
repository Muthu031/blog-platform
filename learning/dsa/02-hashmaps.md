# Hash Maps - O(1) Lookups and Caching

## 1. Concept Overview

Hash Maps (also called Hash Tables, Dictionaries, or Objects in JavaScript) are data structures that store key-value pairs with near-constant time O(1) lookups, insertions, and deletions. They're the backbone of caching, fast data retrieval, and efficient algorithms.

As a senior engineer, you must understand that Hash Maps aren't magic - they use **hash functions** to convert keys into array indexes. The real power comes from eliminating the need to scan through data sequentially. In production systems, Hash Maps are everywhere: session storage, caching layers, indexes, and denormalization strategies.

**Key Insight:** When you hear "I need to look up data quickly", think Hash Map. When data access patterns are random and frequent, Hash Maps dominate. They trade memory for speed - a classic engineering tradeoff.

## 2. Core Principles

### How Hash Maps Work

```
1. Hash Function: key → hash code (number)
2. Index Calculation: hash code % array_size → index
3. Storage: Store value at that index
4. Collision Handling: 
   - Chaining (linked list at each bucket)
   - Open Addressing (find next available slot)
```

### Time Complexity

```
Average Case:
  Lookup:    O(1)
  Insert:    O(1)
  Delete:    O(1)
  
Worst Case (many collisions):
  Lookup:    O(n)
  Insert:    O(n)
  Delete:    O(n)
```

### Space Complexity
- O(n) where n is number of key-value pairs
- Additional overhead: ~1.5-2x actual data size for good performance

### JavaScript Implementation

```typescript
// Objects as Hash Maps
const userCache: Record<string, User> = {};
userCache[userId] = user;  // O(1) insert
const user = userCache[userId];  // O(1) lookup

// Map (better for non-string keys)
const sessionMap = new Map<string, Session>();
sessionMap.set(sessionId, session);  // O(1)
const session = sessionMap.get(sessionId);  // O(1)
```

## 3. Why This Matters in Real Systems

### Large SaaS Platforms Use Hash Maps For:

**1. Caching**
- User sessions (sessionId → Session data)
- Permission lookups (userId → roles)
- API rate limiting (IP → request count)

**2. Indexing**
- Database indexes (internally use hash maps)
- In-memory indexes for fast queries
- Inverted indexes for search

**3. Deduplication**
- Removing duplicate items
- Checking existence (Set operations)
- Finding unique values

**4. Fast Lookups**
- User ID → User object
- Organization ID → Settings
- Task ID → Task data

**Real Example:** 
- **Stripe**: Uses hash maps to cache customer data, reducing database queries by 80%
- **Notion**: Caches page permissions in hash maps for instant access checks
- **Slack**: Stores channel membership in hash maps for real-time message filtering

## 4. Practical Example in My Multi-Tenant SaaS Project

### Scenario 1: Permission Caching

```typescript
// Problem: Checking user permissions on every request is slow
// Bad Approach: Query database every time
async function hasPermission(userId: string, resource: string): Promise<boolean> {
  const permissions = await db.permission.findMany({
    where: { userId }
  });  // Database query on every check!
  
  return permissions.some(p => p.resource === resource);
}

// Good Approach: Cache in hash map
interface PermissionCache {
  [userId: string]: Set<string>;  // userId → Set of permissions
}

const permissionCache: PermissionCache = {};

async function hasPermissionCached(
  userId: string,
  resource: string
): Promise<boolean> {
  // Check cache first
  if (!permissionCache[userId]) {
    // Cache miss - load from database
    const permissions = await db.permission.findMany({
      where: { userId }
    });
    
    // Store in cache as Set for O(1) lookup
    permissionCache[userId] = new Set(
      permissions.map(p => p.resource)
    );
  }
  
  // O(1) permission check
  return permissionCache[userId].has(resource);
}
```

### Scenario 2: Bulk Data Enrichment

```typescript
// Problem: Loading user data for 1000 tasks (N+1 query)
// Bad Approach
async function enrichTasksWithUsers(tasks: Task[]): Promise<EnrichedTask[]> {
  const enriched = [];
  
  for (const task of tasks) {
    const assignee = await db.user.findUnique({
      where: { id: task.assigneeId }
    });  // 1000 queries!
    
    enriched.push({ ...task, assignee });
  }
  
  return enriched;
}

// Good Approach: Hash map for O(1) lookups
async function enrichTasksWithUsers(tasks: Task[]): Promise<EnrichedTask[]> {
  // 1. Extract unique user IDs
  const userIds = [...new Set(
    tasks.map(t => t.assigneeId).filter(Boolean)
  )];
  
  // 2. Fetch all users in one query
  const users = await db.user.findMany({
    where: { id: { in: userIds } }
  });
  
  // 3. Create hash map: userId → User
  const userMap = new Map<string, User>();
  users.forEach(user => userMap.set(user.id, user));
  
  // 4. Enrich tasks with O(1) lookups
  return tasks.map(task => ({
    ...task,
    assignee: task.assigneeId ? userMap.get(task.assigneeId) : null
  }));
}
```

### Scenario 3: Rate Limiting

```typescript
// Track API requests per user
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(userId: string, maxRequests: number = 100): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  const entry = rateLimitMap.get(userId);
  
  // No entry or window expired
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + windowMs
    });
    return true;
  }
  
  // Increment count
  entry.count++;
  
  // Check limit
  if (entry.count > maxRequests) {
    return false; // Rate limit exceeded
  }
  
  return true;
}
```

### Scenario 4: Deduplication

```typescript
// Remove duplicate activity logs
function deduplicateActivities(logs: ActivityLog[]): ActivityLog[] {
  const seen = new Set<string>();
  const unique: ActivityLog[] = [];
  
  for (const log of logs) {
    // Create unique key
    const key = `${log.userId}:${log.action}:${log.resourceId}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(log);
    }
  }
  
  return unique;
}
```

## 5. Backend Architecture Implementation

### Hash Map Usage Across Layers

```typescript
// ======= CACHE LAYER (using Hash Maps) =======
class CacheService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  
  set(key: string, value: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check expiry
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
}

// ======= REPOSITORY LAYER =======
class UserRepository {
  constructor(private cache: CacheService) {}
  
  async findById(userId: string): Promise<User | null> {
    // Check cache first (hash map lookup)
    const cacheKey = `user:${userId}`;
    const cached = this.cache.get<User>(cacheKey);
    
    if (cached) return cached;
    
    // Database query
    const user = await db.user.findUnique({
      where: { id: userId }
    });
    
    if (user) {
      this.cache.set(cacheKey, user, 300); // 5 min TTL
    }
    
    return user;
  }
  
  async findByIds(userIds: string[]): Promise<Map<string, User>> {
    const userMap = new Map<string, User>();
    const uncachedIds: string[] = [];
    
    // Check cache for each user (O(n) hash map lookups)
    for (const id of userIds) {
      const cached = this.cache.get<User>(`user:${id}`);
      
      if (cached) {
        userMap.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }
    
    // Fetch uncached users
    if (uncachedIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: uncachedIds } }
      });
      
      // Add to cache and map
      for (const user of users) {
        this.cache.set(`user:${user.id}`, user, 300);
        userMap.set(user.id, user);
      }
    }
    
    return userMap;
  }
}

// ======= SERVICE LAYER =======
class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private userRepo: UserRepository
  ) {}
  
  async getTasksWithAssignees(projectId: string): Promise<EnrichedTask[]> {
    // 1. Get tasks
    const tasks = await this.taskRepo.findByProject(projectId);
    
    // 2. Extract unique assignee IDs
    const assigneeIds = [...new Set(
      tasks.map(t => t.assigneeId).filter(Boolean) as string[]
    )];
    
    // 3. Get users (utilizes hash map cache)
    const userMap = await this.userRepo.findByIds(assigneeIds);
    
    // 4. Enrich with O(1) lookups
    return tasks.map(task => ({
      ...task,
      assignee: task.assigneeId ? userMap.get(task.assigneeId) : null
    }));
  }
}

// ======= MIDDLEWARE LAYER =======
class RateLimitMiddleware {
  private limits = new Map<string, { count: number; resetAt: number }>();
  
  async checkLimit(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id || req.ip;
    const limit = 100; // 100 requests per minute
    const windowMs = 60 * 1000;
    
    const now = Date.now();
    const entry = this.limits.get(userId);
    
    if (!entry || entry.resetAt < now) {
      this.limits.set(userId, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    entry.count++;
    
    if (entry.count > limit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      });
    }
    
    next();
  }
}

// ======= HELPER: GROUP BY (using Hash Map) =======
function groupBy<T, K>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  
  return groups;
}

// Usage: Group tasks by status
const tasksByStatus = groupBy(tasks, task => task.status);
const todoTasks = tasksByStatus.get('TODO') || [];
```

## 6. Production-Quality Code Example

### Complete Feature: Advanced Caching Layer with Hash Maps

```typescript
// ======= types/cache.types.ts =======
export interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum cache entries
  onEvict?: (key: string, value: any) => void;
}

// ======= services/advanced-cache.service.ts =======
export class AdvancedCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  
  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 10000;
    this.defaultTtl = options.ttl || 300;
  }
  
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    const expirySeconds = ttl || this.defaultTtl;
    
    this.cache.set(key, {
      data: value,
      expiry: Date.now() + expirySeconds * 1000,
      hits: 0
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check expiry
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update hit count
    entry.hits++;
    this.stats.hits++;
    
    return entry.data as T;
  }
  
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    // Cache miss - fetch and store
    const data = await fetcher();
    this.set(key, data, ttl);
    
    return data;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }
  
  // Least Recently Used eviction
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHits = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
  
  // Invalidate by pattern (for cache busting)
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
}

// ======= services/user-with-cache.service.ts =======
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private cache: AdvancedCacheService
  ) {}
  
  async getUserById(userId: string): Promise<User | null> {
    return this.cache.getOrFetch(
      `user:${userId}`,
      () => this.userRepo.findById(userId),
      300 // 5 minutes
    );
  }
  
  async getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
    const userMap = new Map<string, User>();
    const uncachedIds: string[] = [];
    
    // Check cache for each
    for (const id of userIds) {
      const cached = this.cache.get<User>(`user:${id}`);
      
      if (cached) {
        userMap.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }
    
    // Fetch uncached
    if (uncachedIds.length > 0) {
      const users = await this.userRepo.findByIds(uncachedIds);
      
      users.forEach(user => {
        this.cache.set(`user:${user.id}`, user, 300);
        userMap.set(user.id, user);
      });
    }
    
    return userMap;
  }
  
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const user = await this.userRepo.update(userId, data);
    
    // Invalidate cache
    this.cache.delete(`user:${userId}`);
    
    return user;
  }
  
  async deleteUser(userId: string): Promise<void> {
    await this.userRepo.delete(userId);
    
    // Invalidate all user-related cache
    this.cache.invalidatePattern(new RegExp(`user:${userId}`));
  }
}

// ======= controllers/cache-admin.controller.ts =======
export class CacheAdminController {
  constructor(private cache: AdvancedCacheService) {}
  
  async getStats(req: Request, res: Response) {
    const stats = this.cache.getStats();
    
    res.json({
      ...stats,
      hitRatePercent: (stats.hitRate * 100).toFixed(2) + '%'
    });
  }
  
  async clearCache(req: Request, res: Response) {
    this.cache.clear();
    
    res.json({ success: true, message: 'Cache cleared' });
  }
  
  async invalidatePattern(req: Request, res: Response) {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({ error: 'Pattern required' });
    }
    
    const count = this.cache.invalidatePattern(new RegExp(pattern));
    
    res.json({ success: true, invalidated: count });
  }
}
```

## 7. Database Perspective

### PostgreSQL: Hash Indexes

```sql
-- Hash indexes for equality lookups
CREATE INDEX idx_users_email_hash ON users USING hash(email);

-- Good for: WHERE email = 'user@example.com'
-- Bad for: WHERE email LIKE '%example%' or range queries

-- B-tree (default) vs Hash
-- B-tree: supports <, >, <=, >=, =, BETWEEN
-- Hash: supports = only, but slightly faster for equality
```

### Redis: Native Hash Map Support

```typescript
// Redis as a hash map store
import Redis from 'ioredis';

const redis = new Redis();

// Store user session (hash map)
async function storeSession(sessionId: string, data: SessionData) {
  await redis.hmset(`session:${sessionId}`, {
    userId: data.userId,
    organizationId: data.organizationId,
    createdAt: Date.now().toString()
  });
  
  await redis.expire(`session:${sessionId}`, 3600); // 1 hour
}

// Get session
async function getSession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.hgetall(`session:${sessionId}`);
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  return {
    userId: data.userId,
    organizationId: data.organizationId,
    createdAt: parseInt(data.createdAt)
  };
}

// Store permission set (using Redis SET - which is a hash map internally)
async function storePermissions(userId: string, permissions: string[]) {
  await redis.sadd(`permissions:${userId}`, ...permissions);
  await redis.expire(`permissions:${userId}`, 600); // 10 minutes
}

// Check permission (O(1) lookup)
async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const result = await redis.sismember(`permissions:${userId}`, permission);
  return result === 1;
}
```

### Database Query Result Mapping

```typescript
// Convert array result to hash map for fast lookups
async function getProjectsMap(organizationId: string): Promise<Map<string, Project>> {
  const projects = await db.project.findMany({
    where: { organizationId }
  });
  
  // O(n) to build map, then O(1) lookups
  const projectMap = new Map<string, Project>();
  
  projects.forEach(project => {
    projectMap.set(project.id, project);
  });
  
  return projectMap;
}

// Usage in task enrichment
const projectMap = await getProjectsMap(orgId);
const enrichedTasks = tasks.map(task => ({
  ...task,
  project: projectMap.get(task.projectId) // O(1) lookup
}));
```

## 8. Common Developer Mistakes

### ❌ Mistake 1: Using Arrays for Frequent Lookups

```typescript
// BAD: O(n) lookup for every check
const users: User[] = await db.user.findMany();

function findUser(userId: string): User | undefined {
  return users.find(u => u.id === userId); // O(n)
}

// Called 1000 times = O(1000n) = slow!

// GOOD: O(1) lookup with hash map
const userMap = new Map(users.map(u => [u.id, u]));

function findUser(userId: string): User | undefined {
  return userMap.get(userId); // O(1)
}
```

### ❌ Mistake 2: No Cache Invalidation

```typescript
// BAD: Stale cache data
const cache = new Map<string, User>();

async function getUser(userId: string) {
  if (cache.has(userId)) {
    return cache.get(userId); // May be stale!
  }
  
  const user = await db.user.findUnique({ where: { id: userId } });
  cache.set(userId, user);
  return user;
}

async function updateUser(userId: string, data: Partial<User>) {
  await db.user.update({ where: { id: userId }, data });
  // ❌ Forgot to invalidate cache!
}

// GOOD: Invalidate on mutation
async function updateUser(userId: string, data: Partial<User>) {
  const user = await db.user.update({ where: { id: userId }, data });
  cache.delete(userId); // ✅ Clear cache
  return user;
}
```

### ❌ Mistake 3: Unbounded Cache Growth

```typescript
// BAD: Cache grows forever
const cache = new Map<string, any>();

async function cacheData(key: string, data: any) {
  cache.set(key, data); // No limit, no expiry!
}

// After 1 million requests, cache could be 10GB+ in memory!

// GOOD: Implement eviction and TTL
class BoundedCache {
  private cache = new Map();
  private readonly maxSize = 10000;
  
  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest (first key)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
}
```

### ❌ Mistake 4: Wrong Key Design

```typescript
// BAD: Complex object as key
const cache = new Map();
const key = { userId: '123', projectId: '456' }; // ❌ Won't work as expected
cache.set(key, data);
cache.get({ userId: '123', projectId: '456' }); // null - different object!

// GOOD: String keys
const key = `user:${userId}:project:${projectId}`;
cache.set(key, data);
cache.get(key); // ✅ Works
```

## 9. Senior Engineer Thinking

### Decision Framework: When to Use Hash Maps

**Use Hash Map When:**
- ✅ Need O(1) lookups by key
- ✅ Keys are unique or need deduplication
- ✅ Random access pattern
- ✅ Caching data
- ✅ Building indexes

**Don't Use Hash Map When:**
- ❌ Need ordered iteration (use Map or Array)
- ❌ Need range queries (use B-tree)
- ❌ Memory is very constrained
- ❌ Few lookups (array might be faster for small n)

### Performance Tuning

```typescript
// Junior: No thought about data structure
async function enrichTasks(tasks: Task[]) {
  const enriched = [];
  
  for (const task of tasks) {
    const user = await db.user.findUnique({ where: { id: task.assigneeId } });
    const project = await db.project.findUnique({ where: { id: task.projectId } });
    enriched.push({ ...task, user, project });
  }
  
  return enriched; // O(2n) database queries!
}

// Senior: Hash map for batch loading
async function enrichTasks(tasks: Task[]) {
  // Extract unique IDs
  const userIds = [...new Set(tasks.map(t => t.assigneeId).filter(Boolean))];
  const projectIds = [...new Set(tasks.map(t => t.projectId))];
  
  // Batch load
  const [users, projects] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } } }),
    db.project.findMany({ where: { id: { in: projectIds } } })
  ]); // 2 queries total!
  
  // Build hash maps
  const userMap = new Map(users.map(u => [u.id, u]));
  const projectMap = new Map(projects.map(p => [p.id, p]));
  
  // Enrich with O(1) lookups
  return tasks.map(task => ({
    ...task,
    user: userMap.get(task.assigneeId),
    project: projectMap.get(task.projectId)
  }));
}
```

### Caching Strategy

```typescript
// Multi-level caching with hash maps
class MultiLevelCache {
  private l1 = new Map<string, any>(); // In-memory (fast)
  private redis: Redis; // Redis (shared)
  
  async get<T>(key: string): Promise<T | null> {
    // L1: Check in-memory
    if (this.l1.has(key)) {
      return this.l1.get(key);
    }
    
    // L2: Check Redis
    const cached = await this.redis.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      this.l1.set(key, data); // Promote to L1
      return data;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number) {
    this.l1.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

## 10. Performance and Scalability Impact

### Benchmark: Array vs Hash Map

```typescript
// Scenario: Find user by ID in list of 10,000 users

// Array approach
const users: User[] = []; // 10,000 users
const user = users.find(u => u.id === targetId); // O(n) = ~5000 comparisons average

// Hash Map approach
const userMap = new Map(users.map(u => [u.id, u])); // O(n) to build, once
const user = userMap.get(targetId); // O(1) = 1 lookup

// For 1000 lookups:
// Array: 1000 * 5000 = 5,000,000 operations
// Hash Map: 10,000 (build) + 1000 (lookups) = 11,000 operations
// Speed up: 454x faster!
```

### Memory Trade-off

```
Array: [user1, user2, user3, ...]
Memory: n * sizeof(User)

Hash Map: { id1 → user1, id2 → user2, ... }
Memory: n * (sizeof(User) + sizeof(Key) + overhead)
Typical overhead: ~1.5-2x array size

Example:
- 10,000 users × 500 bytes = 5MB (array)
- 10,000 users × 800 bytes = 8MB (hash map)
- Extra 3MB for O(1) lookups = worth it!
```

### Scaling Considerations

```typescript
// Problem: Cache invalidation across multiple servers

// Single server: Easy
const cache = new Map();
cache.delete(key); // All requests hit same cache

// Multiple servers: Need shared cache
// Solution 1: Redis
await redis.del(key); // All servers see invalidation

// Solution 2: Pub/Sub for cache invalidation
redis.publish('cache:invalidate', key);
// All servers listen and clear local cache
```

## 11. Interview Perspective

### Common Questions

**Q1: Implement an LRU Cache**

```typescript
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private capacity: number;
  
  constructor(capacity: number) {
    this.cache = new Map();
    this.capacity = capacity;
  }
  
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  put(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end
    this.cache.set(key, value);
    
    // Evict LRU if over capacity
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}
```

**Q2: Design a Rate Limiter**

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(userId) || [];
    
    // Remove old timestamps outside window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    // Check limit
    if (validTimestamps.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validTimestamps.push(now);
    this.requests.set(userId, validTimestamps);
    
    return true;
  }
}
```

**Q3: Group Anagrams (Classic Interview Problem)**

```typescript
function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  
  for (const word of words) {
    // Create key: sorted characters
    const key = word.split('').sort().join('');
    
    const group = groups.get(key) || [];
    group.push(word);
    groups.set(key, group);
  }
  
  return Array.from(groups.values());
}

// Input: ["eat", "tea", "tan", "ate", "nat", "bat"]
// Output: [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

## 12. Practical Exercise

### Task: Build a Multi-Level Permission Cache System

**Requirements:**
1. Cache user permissions in memory (hash map)
2. Invalidate on permission changes
3. Batch load permissions for multiple users
4. Support wildcard permissions (e.g., `projects.*`)
5. Track cache hit rate
6. Implement TTL and auto-refresh
7. Add admin API for cache stats

**Implementation Steps:**

```typescript
// 1. Define types
interface Permission {
  userId: string;
  resource: string;
  action: string;
}

interface PermissionCacheEntry {
  permissions: Set<string>;
  loadedAt: number;
  hits: number;
}

// 2. Implement cache service
class PermissionCacheService {
  private cache: Map<string, PermissionCacheEntry> = new Map();
  private ttl: number = 300000; // 5 minutes
  
  // TODO: Implement these methods
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // 1. Check cache
    // 2. If miss, load from DB
    // 3. Check permission
    // 4. Track stats
  }
  
  async loadPermissions(userId: string): Promise<void> {
    // 1. Fetch from database
    // 2. Store in cache as Set
    // 3. Set TTL
  }
  
  async invalidate(userId: string): void {
    // Clear user's permissions from cache
  }
  
  getStats(): CacheStats {
    // Return hit rate, size, etc.
  }
}

// 3. Integrate with middleware
class PermissionMiddleware {
  async checkPermission(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { userId } = req.user;
    const resource = req.baseUrl;
    const action = req.method.toLowerCase();
    
    const allowed = await permissionCache.hasPermission(
      userId,
      resource,
      action
    );
    
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  }
}

// 4. Add cache stats endpoint
router.get('/admin/cache/permissions/stats', async (req, res) => {
  const stats = permissionCache.getStats();
  res.json(stats);
});
```

**Success Criteria:**
- ✅ O(1) permission checks
- ✅ Batch loading for multiple users
- ✅ Automatic expiry and refresh
- ✅ Cache invalidation on updates
- ✅ Hit rate tracking
- ✅ Wildcard permission support

## 13. Advanced Learning Extension

### Advanced Hash Map Patterns

**1. Bloom Filters (Space-Efficient Hash Map)**
```typescript
// Check existence without storing values
class BloomFilter {
  private bits: boolean[];
  
  constructor(size: number) {
    this.bits = new Array(size).fill(false);
  }
  
  add(value: string) {
    const hash1 = this.hash(value, 0) % this.bits.length;
    const hash2 = this.hash(value, 1) % this.bits.length;
    this.bits[hash1] = true;
    this.bits[hash2] = true;
  }
  
  mightContain(value: string): boolean {
    const hash1 = this.hash(value, 0) % this.bits.length;
    const hash2 = this.hash(value, 1) % this.bits.length;
    return this.bits[hash1] && this.bits[hash2];
  }
  
  private hash(value: string, seed: number): number {
    // Simple hash function
    let hash = seed;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) % 1000000007;
    }
    return hash;
  }
}

// Use case: Check if email exists before querying DB
const emailBloomFilter = new BloomFilter(10000);
if (!emailBloomFilter.mightContain(email)) {
  return { error: 'Email not found' }; // No DB query needed
}
```

**2. Consistent Hashing (Distributed Systems)**
```typescript
// Distribute data across servers
class ConsistentHash {
  private ring: Map<number, string> = new Map();
  private vnodes = 150; // Virtual nodes per server
  
  addServer(serverId: string) {
    for (let i = 0; i < this.vnodes; i++) {
      const hash = this.hash(`${serverId}:${i}`);
      this.ring.set(hash, serverId);
    }
  }
  
  getServer(key: string): string {
    const hash = this.hash(key);
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
    
    for (const h of sortedHashes) {
      if (h >= hash) {
        return this.ring.get(h)!;
      }
    }
    
    return this.ring.get(sortedHashes[0])!;
  }
  
  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) % 1000000007;
    }
    return hash;
  }
}
```

---

## Next Lesson

Continue to [Stacks - LIFO and History Tracking](03-stacks.md)

---

**Remember:** Hash Maps are your go-to tool for O(1) lookups. Master them for caching, indexing, and fast data retrieval!
