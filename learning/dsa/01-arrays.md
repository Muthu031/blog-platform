# Arrays - The Foundation of Data Manipulation

## 1. Concept Overview

Arrays are contiguous blocks of memory that store elements of the same type, accessible via indexes. In backend development, arrays are the workhorse for managing collections of data - from user lists to task batches.

As a senior engineer, you need to understand that arrays aren't just "lists of things." They're about **data locality**, **cache efficiency**, and **predictable memory access patterns**. In Node.js/TypeScript, JavaScript arrays are actually dynamic arrays (similar to ArrayList in Java or vector in C++), which means they automatically resize, but this comes with memory and performance trade-offs you must understand.

**Key Insight:** In production systems, choosing between an array and other data structures often comes down to access patterns. If you need random access (O(1)) and know approximate size, arrays excel. If you're constantly inserting/deleting in the middle, consider other structures.

## 2. Core Principles

### Memory Layout
- **Contiguous Storage**: Elements stored in adjacent memory locations
- **Index-Based Access**: Direct access via `array[index]` in O(1) time
- **Dynamic Sizing**: JavaScript arrays grow automatically, but with reallocation cost

### Time Complexity
```
Access:     O(1) - array[index]
Search:     O(n) - must scan entire array
Insert:     O(n) - worst case (shift elements)
Delete:     O(n) - worst case (shift elements)
Push/Pop:   O(1) - amortized (end operations)
```

### Space Complexity
- **Static**: O(n) where n is number of elements
- **Dynamic**: O(n) but with potential over-allocation for growth

## 3. Why This Matters in Real Systems

### Large SaaS Platforms Use Arrays For:

**1. Bulk Operations**
- Fetching all tasks in a project
- Retrieving users in an organization
- Loading notifications for a user

**2. Batch Processing**
- Processing 1000 emails in a queue
- Bulk-updating task statuses
- Batch-inserting activity logs

**3. Caching**
- Storing recent search results
- Maintaining in-memory user sessions
- Caching frequently accessed data

**4. Data Transfer**
- API responses (JSON arrays)
- Database query results
- Message queue payloads

**Real Example:** Atlassian's Jira loads tasks as arrays, applies filters client/server-side, and uses array methods like `map()`, `filter()`, `reduce()` for transformations.

## 4. Practical Example in My Multi-Tenant SaaS Project

### Scenario 1: Loading All Tasks for a Project

```typescript
// Bad Approach - Loading one by one
async function getProjectTasks(projectId: string) {
  const taskIds = await getTaskIds(projectId);
  const tasks = [];
  for (const id of taskIds) {
    const task = await fetchTask(id); // N+1 query problem!
    tasks.push(task);
  }
  return tasks;
}

// Good Approach - Batch load as array
async function getProjectTasks(projectId: string) {
  const tasks = await db.task.findMany({
    where: { projectId },
    include: { assignee: true, comments: true }
  });
  return tasks; // Single query, returns array
}
```

### Scenario 2: Bulk Role Assignment

```typescript
// Assign multiple users to a project
async function bulkAssignUsers(
  projectId: string,
  userIds: string[],
  role: string
) {
  const assignments = userIds.map(userId => ({
    projectId,
    userId,
    role,
    createdAt: new Date()
  }));
  
  return await db.projectMember.createMany({
    data: assignments // Array of objects
  });
}
```

### Scenario 3: Activity Log Filtering

```typescript
// Filter and transform activity logs
function getRecentUserActivity(
  logs: ActivityLog[],
  userId: string,
  limit: number
) {
  return logs
    .filter(log => log.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map(log => ({
      action: log.action,
      timestamp: log.createdAt,
      resource: log.resourceType
    }));
}
```

## 5. Backend Architecture Implementation

### Layered Architecture with Arrays

```typescript
// ======= MODELS/TYPES =======
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  projectId: string;
  organizationId: string;
  priority: number;
  createdAt: Date;
}

// ======= REPOSITORY LAYER =======
class TaskRepository {
  // Raw data access - returns arrays
  async findByProject(projectId: string): Promise<Task[]> {
    return await db.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  async findByIds(taskIds: string[]): Promise<Task[]> {
    return await db.task.findMany({
      where: { id: { in: taskIds } }
    });
  }
  
  async bulkCreate(tasks: Partial<Task>[]): Promise<Task[]> {
    const created = await db.task.createMany({
      data: tasks
    });
    return this.findByIds(tasks.map(t => t.id!));
  }
}

// ======= SERVICE LAYER =======
class TaskService {
  constructor(private taskRepo: TaskRepository) {}
  
  // Business logic with array operations
  async getHighPriorityTasks(
    projectId: string,
    organizationId: string
  ): Promise<Task[]> {
    const tasks = await this.taskRepo.findByProject(projectId);
    
    // Authorization check
    this.ensureAccess(organizationId, tasks);
    
    // Filter high priority
    return tasks
      .filter(task => task.priority >= 8)
      .sort((a, b) => b.priority - a.priority);
  }
  
  async bulkUpdateStatus(
    taskIds: string[],
    newStatus: TaskStatus,
    organizationId: string
  ): Promise<void> {
    const tasks = await this.taskRepo.findByIds(taskIds);
    
    // Validate all tasks belong to organization
    if (tasks.some(t => t.organizationId !== organizationId)) {
      throw new ForbiddenError('Access denied');
    }
    
    // Bulk update
    await db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status: newStatus }
    });
  }
  
  private ensureAccess(orgId: string, tasks: Task[]): void {
    if (tasks.some(t => t.organizationId !== orgId)) {
      throw new ForbiddenError();
    }
  }
}

// ======= CONTROLLER LAYER =======
class TaskController {
  constructor(private taskService: TaskService) {}
  
  async getProjectTasks(req: Request, res: Response) {
    const { projectId } = req.params;
    const { organizationId } = req.user;
    
    const tasks = await this.taskService.getHighPriorityTasks(
      projectId,
      organizationId
    );
    
    // Transform for API response (array mapping)
    const response = tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority
    }));
    
    res.json({ data: response, count: response.length });
  }
  
  async bulkAssign(req: Request, res: Response) {
    const { taskIds, assigneeId } = req.body;
    const { organizationId } = req.user;
    
    // Validate array input
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Invalid taskIds array' });
    }
    
    await this.taskService.bulkUpdateStatus(
      taskIds,
      'IN_PROGRESS',
      organizationId
    );
    
    res.json({ success: true, updated: taskIds.length });
  }
}
```

## 6. Production-Quality Code Example

### Complete Feature: Bulk Task Operations

```typescript
// ======= types/task.types.ts =======
export interface BulkTaskOperation {
  taskIds: string[];
  operation: 'assign' | 'status_change' | 'priority_update';
  value: string | number;
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{ id: string; reason: string }>;
  totalProcessed: number;
}

// ======= services/bulk-task.service.ts =======
export class BulkTaskService {
  constructor(
    private taskRepo: TaskRepository,
    private activityLogger: ActivityLogService
  ) {}
  
  async executeBulkOperation(
    operation: BulkTaskOperation,
    userId: string,
    organizationId: string
  ): Promise<BulkOperationResult> {
    const { taskIds, operation: opType, value } = operation;
    
    // Fetch all tasks
    const tasks = await this.taskRepo.findByIds(taskIds);
    
    // Authorization: partition into allowed and forbidden
    const [allowed, forbidden] = this.partitionByAccess(
      tasks,
      organizationId
    );
    
    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    
    // Process allowed tasks
    try {
      switch (opType) {
        case 'assign':
          await this.bulkAssign(allowed, value as string);
          break;
        case 'status_change':
          await this.bulkUpdateStatus(allowed, value as string);
          break;
        case 'priority_update':
          await this.bulkUpdatePriority(allowed, value as number);
          break;
      }
      
      successful.push(...allowed.map(t => t.id));
      
      // Log activity for all successful operations
      await this.logBulkActivity(allowed, opType, userId);
      
    } catch (error) {
      // If bulk operation fails, mark all as failed
      failed.push(...allowed.map(t => ({
        id: t.id,
        reason: 'Operation failed'
      })));
    }
    
    // Add forbidden tasks to failed
    failed.push(...forbidden.map(t => ({
      id: t.id,
      reason: 'Access denied'
    })));
    
    return {
      successful,
      failed,
      totalProcessed: taskIds.length
    };
  }
  
  private partitionByAccess(
    tasks: Task[],
    organizationId: string
  ): [Task[], Task[]] {
    const allowed: Task[] = [];
    const forbidden: Task[] = [];
    
    for (const task of tasks) {
      if (task.organizationId === organizationId) {
        allowed.push(task);
      } else {
        forbidden.push(task);
      }
    }
    
    return [allowed, forbidden];
  }
  
  private async bulkAssign(tasks: Task[], assigneeId: string) {
    const taskIds = tasks.map(t => t.id);
    await db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { assigneeId }
    });
  }
  
  private async bulkUpdateStatus(tasks: Task[], status: string) {
    const taskIds = tasks.map(t => t.id);
    await db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status }
    });
  }
  
  private async bulkUpdatePriority(tasks: Task[], priority: number) {
    const taskIds = tasks.map(t => t.id);
    await db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { priority }
    });
  }
  
  private async logBulkActivity(
    tasks: Task[],
    operation: string,
    userId: string
  ) {
    const logs = tasks.map(task => ({
      userId,
      action: `bulk_${operation}`,
      resourceType: 'task',
      resourceId: task.id,
      organizationId: task.organizationId,
      createdAt: new Date()
    }));
    
    await db.activityLog.createMany({ data: logs });
  }
}

// ======= validation/bulk-task.validation.ts =======
import { z } from 'zod';

export const bulkTaskOperationSchema = z.object({
  taskIds: z.array(z.string().uuid())
    .min(1, 'At least one task ID required')
    .max(100, 'Maximum 100 tasks per operation'),
  operation: z.enum(['assign', 'status_change', 'priority_update']),
  value: z.union([z.string(), z.number()])
});

// ======= controllers/bulk-task.controller.ts =======
export class BulkTaskController {
  constructor(private bulkTaskService: BulkTaskService) {}
  
  async executeBulkOperation(req: Request, res: Response) {
    const { userId, organizationId } = req.user;
    
    // Validate input
    const validation = bulkTaskOperationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.errors });
    }
    
    const result = await this.bulkTaskService.executeBulkOperation(
      validation.data,
      userId,
      organizationId
    );
    
    res.json({
      success: true,
      result
    });
  }
}
```

## 7. Database Perspective

### PostgreSQL: Array Queries

```sql
-- Fetch multiple tasks by IDs (IN clause takes array)
SELECT * FROM tasks 
WHERE id = ANY($1::uuid[]);  -- Parameter: ['id1', 'id2', 'id3']

-- Bulk insert (Prisma generates this)
INSERT INTO tasks (id, title, status, project_id, organization_id)
VALUES 
  ('id1', 'Task 1', 'TODO', 'proj1', 'org1'),
  ('id2', 'Task 2', 'TODO', 'proj1', 'org1'),
  ('id3', 'Task 3', 'TODO', 'proj1', 'org1');

-- Fetch with ORDER BY (returns sorted array)
SELECT * FROM tasks 
WHERE project_id = $1
ORDER BY priority DESC, created_at DESC
LIMIT 50;

-- Aggregate operations on arrays
SELECT 
  project_id,
  COUNT(*) as task_count,
  ARRAY_AGG(id) as task_ids,  -- Creates array of IDs
  ARRAY_AGG(status) as statuses
FROM tasks
GROUP BY project_id;
```

### Redis: Caching Arrays

```typescript
// Cache array of tasks
async function cacheProjectTasks(projectId: string, tasks: Task[]) {
  const cacheKey = `project:${projectId}:tasks`;
  const ttl = 300; // 5 minutes
  
  await redis.setex(
    cacheKey,
    ttl,
    JSON.stringify(tasks)  // Serialize array
  );
}

// Retrieve cached array
async function getCachedProjectTasks(
  projectId: string
): Promise<Task[] | null> {
  const cacheKey = `project:${projectId}:tasks`;
  const cached = await redis.get(cacheKey);
  
  return cached ? JSON.parse(cached) : null;
}

// Service with caching
async function getProjectTasksWithCache(
  projectId: string
): Promise<Task[]> {
  // Try cache first
  const cached = await getCachedProjectTasks(projectId);
  if (cached) return cached;
  
  // Cache miss - fetch from database
  const tasks = await db.task.findMany({
    where: { projectId }
  });
  
  // Update cache
  await cacheProjectTasks(projectId, tasks);
  
  return tasks;
}
```

### Indexing for Array Operations

```sql
-- Index for array membership queries
CREATE INDEX idx_tasks_project_status 
ON tasks(project_id, status) 
WHERE deleted_at IS NULL;

-- Composite index for sorted queries
CREATE INDEX idx_tasks_priority_created 
ON tasks(project_id, priority DESC, created_at DESC);

-- Partial index for active tasks
CREATE INDEX idx_active_tasks 
ON tasks(organization_id) 
WHERE status IN ('TODO', 'IN_PROGRESS');
```

## 8. Common Developer Mistakes

### ❌ Mistake 1: N+1 Query Problem

```typescript
// BAD: Loading comments one by one
async function getTasksWithComments(projectId: string) {
  const tasks = await db.task.findMany({ where: { projectId } });
  
  for (const task of tasks) {
    task.comments = await db.comment.findMany({
      where: { taskId: task.id }
    });  // N queries!
  }
  
  return tasks;
}

// GOOD: Use includes or joins
async function getTasksWithComments(projectId: string) {
  return await db.task.findMany({
    where: { projectId },
    include: { comments: true }  // Single query with JOIN
  });
}
```

### ❌ Mistake 2: Not Validating Array Size

```typescript
// BAD: No limit on array size
async function bulkDelete(taskIds: string[]) {
  await db.task.deleteMany({
    where: { id: { in: taskIds } }
  });  // Could delete millions!
}

// GOOD: Validate and limit
async function bulkDelete(taskIds: string[]) {
  if (taskIds.length > 100) {
    throw new Error('Cannot delete more than 100 tasks at once');
  }
  
  await db.task.deleteMany({
    where: { id: { in: taskIds } }
  });
}
```

### ❌ Mistake 3: Mutating Shared Arrays

```typescript
// BAD: Mutating input array
function processTaskArray(tasks: Task[]) {
  tasks.sort((a, b) => b.priority - a.priority);  // Mutates!
  tasks.splice(0, 10);  // Mutates!
  return tasks;
}

// GOOD: Create new array
function processTaskArray(tasks: Task[]) {
  return tasks
    .slice()  // Create copy
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);
}

// BETTER: Use immutable operations
function processTaskArray(tasks: Task[]) {
  return [...tasks]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);
}
```

### ❌ Mistake 4: Loading Entire Table

```typescript
// BAD: No pagination
async function getAllTasks() {
  return await db.task.findMany();  // Could be millions!
}

// GOOD: Always paginate
async function getTasks(page: number, limit: number) {
  const skip = (page - 1) * limit;
  
  return await db.task.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
}
```

## 9. Senior Engineer Thinking

### How Experts Approach Arrays

**1. Access Pattern Analysis**
```
"Do I need sequential access or random access?"
- Sequential → Array is fine
- Random + frequent inserts → Consider HashMap
```

**2. Size Estimation**
```
"How big will this array grow?"
- Small (<1000) → In-memory arrays work
- Large (>10k) → Need pagination, streaming
- Unbounded → Must have limits
```

**3. Memory Considerations**
```
"Am I keeping this in memory?"
- Yes → Ensure it's bounded and cached efficiently
- No → Stream from database, process in chunks
```

**4. Transformation Efficiency**
```typescript
// Junior: Multiple passes
const filtered = tasks.filter(t => t.status === 'TODO');
const sorted = filtered.sort((a, b) => b.priority - a.priority);
const mapped = sorted.map(t => ({ id: t.id, title: t.title }));

// Senior: Single pass where possible
const result = tasks
  .filter(t => t.status === 'TODO')
  .sort((a, b) => b.priority - a.priority)
  .map(t => ({ id: t.id, title: t.title }));
  
// Or use reduce for complex transformations
const result = tasks.reduce((acc, task) => {
  if (task.status === 'TODO') {
    acc.push({ id: task.id, title: task.title });
  }
  return acc;
}, [] as Array<{id: string, title: string}>);
```

**5. Database vs. Application Filtering**
```typescript
// Ask: "Should I filter in DB or application code?"

// Filter in DB when:
// - Reduces data transfer
// - Can use indexes
// - Large result set before filtering

const tasks = await db.task.findMany({
  where: { 
    projectId,
    status: 'TODO',  // Filter in DB
    priority: { gte: 5 }
  }
});

// Filter in application when:
// - Complex business logic
// - Need data from multiple sources
// - Already have data in memory
```

## 10. Performance and Scalability Impact

### Performance Characteristics

| Operation | Time | Impact |
|-----------|------|--------|
| Load 100 tasks | ~10ms | ✅ Fast with index |
| Load 10,000 tasks | ~200ms | ⚠️ Use pagination |
| Bulk insert 1,000 | ~50ms | ✅ Single query |
| Filter 10,000 in memory | ~5ms | ✅ Fast for simple filters |
| Sort 10,000 in memory | ~15ms | ⚠️ Consider DB sorting |

### Memory Impact

```typescript
// Memory usage estimation
const taskCount = 10000;
const avgTaskSize = 500; // bytes (JSON serialized)
const memoryUsage = taskCount * avgTaskSize; // ~5MB

// If caching this in Redis
const ttl = 300; // 5 minutes
const requestsPerSecond = 100;
const uniqueProjects = 1000;

// Worst case memory: 1000 projects × 5MB = 5GB
// Solution: Limit cache size, use LRU eviction
```

### Scalability Considerations

**1. Database Impact**
- Fetching large arrays can overwhelm DB connections
- Use connection pooling
- Implement query timeouts
- Monitor slow query logs

**2. Network Impact**
- Large JSON arrays increase response time
- Compress responses (gzip)
- Use pagination
- Consider GraphQL for selective fields

**3. Application Memory**
- Don't load entire tables
- Stream large datasets
- Use generators for iteration

```typescript
// Stream large datasets
async function* streamTasks(projectId: string) {
  const batchSize = 100;
  let page = 0;
  
  while (true) {
    const tasks = await db.task.findMany({
      where: { projectId },
      skip: page * batchSize,
      take: batchSize
    });
    
    if (tasks.length === 0) break;
    
    yield* tasks;  // Yield each task
    page++;
  }
}

// Usage
for await (const task of streamTasks('project-123')) {
  await processTask(task);  // Process one at a time
}
```

## 11. Interview Perspective

### Common Array Questions for Backend Engineers

**Question 1: Design a bulk operation API**
```
"Design an endpoint that allows users to update multiple tasks 
at once. Consider authorization, validation, and error handling."

What interviewers look for:
✅ Input validation (array size limits)
✅ Authorization checks (partition by access)
✅ Partial success handling
✅ Performance considerations (batch updates)
✅ Transaction handling
✅ Idempotency
```

**Question 2: Optimize this query**
```typescript
// Given: Slow endpoint
async function getUserTasks(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  const projects = await db.project.findMany({ 
    where: { organizationId: user.organizationId } 
  });
  
  const tasks = [];
  for (const project of projects) {
    const projectTasks = await db.task.findMany({ 
      where: { projectId: project.id, assigneeId: userId } 
    });
    tasks.push(...projectTasks);
  }
  
  return tasks;
}

// Optimized: Single query
async function getUserTasks(userId: string) {
  return await db.task.findMany({
    where: { assigneeId: userId },
    include: { project: true }
  });
}
```

**Question 3: Implement pagination with cursor**
```typescript
interface PaginationParams {
  limit: number;
  cursor?: string;  // Last item ID from previous page
}

async function getPaginatedTasks(
  projectId: string,
  params: PaginationParams
) {
  const { limit, cursor } = params;
  
  const tasks = await db.task.findMany({
    where: { 
      projectId,
      ...(cursor && { id: { lt: cursor } })  // Cursor-based
    },
    take: limit + 1,  // Fetch one extra to know if more exist
    orderBy: { createdAt: 'desc' }
  });
  
  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, -1) : tasks;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return {
    items,
    nextCursor,
    hasMore
  };
}
```

### What Senior Engineers Explain

- **Tradeoffs**: "Arrays provide O(1) access but O(n) insertion"
- **Scaling**: "At 10k items, we should paginate"
- **Caching**: "We can cache this array for 5 minutes"
- **Database**: "This should be an IN query, not N queries"
- **Memory**: "Loading all at once could cause OOM"

## 12. Practical Exercise

### Task: Implement Bulk Task Assignment with Activity Logging

**Requirements:**
1. Create an endpoint: `POST /api/tasks/bulk-assign`
2. Accept array of task IDs and assignee ID
3. Validate all tasks exist and user has access
4. Update tasks in a single database operation
5. Log activity for each task assignment
6. Return success/failure results per task
7. Handle partial failures gracefully
8. Add proper error handling and validation

**Implementation Steps:**

1. **Create the types**
```typescript
// types/bulk-assign.types.ts
export interface BulkAssignRequest {
  taskIds: string[];
  assigneeId: string;
}

export interface BulkAssignResult {
  successful: Array<{ taskId: string; assigneeId: string }>;
  failed: Array<{ taskId: string; reason: string }>;
}
```

2. **Create validation schema**
```typescript
// validation/bulk-assign.validation.ts
import { z } from 'zod';

export const bulkAssignSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(50),
  assigneeId: z.string().uuid()
});
```

3. **Implement service**
```typescript
// services/bulk-assign.service.ts
export class BulkAssignService {
  async bulkAssign(
    request: BulkAssignRequest,
    organizationId: string,
    userId: string
  ): Promise<BulkAssignResult> {
    // TODO: Implement
    // 1. Fetch tasks by IDs
    // 2. Validate assignee exists and is in organization
    // 3. Partition tasks by access rights
    // 4. Bulk update allowed tasks
    // 5. Create activity logs
    // 6. Return results
  }
}
```

4. **Create controller and route**
```typescript
// controllers/bulk-assign.controller.ts
export class BulkAssignController {
  async bulkAssign(req: Request, res: Response) {
    // TODO: Implement
    // 1. Validate request
    // 2. Call service
    // 3. Return response
  }
}

// routes/bulk-assign.routes.ts
router.post('/tasks/bulk-assign', 
  authMiddleware,
  bulkAssignController.bulkAssign
);
```

5. **Add tests**
```typescript
describe('Bulk Task Assignment', () => {
  it('should assign tasks successfully', async () => {
    // TODO: Test happy path
  });
  
  it('should handle partial access', async () => {
    // TODO: Test mixed access rights
  });
  
  it('should validate array size limits', async () => {
    // TODO: Test validation
  });
});
```

**Success Criteria:**
- ✅ Handles up to 50 tasks per request
- ✅ Returns partial success/failure details
- ✅ Creates activity log for each assignment
- ✅ Validates organization access
- ✅ Uses single bulk update query
- ✅ Has proper error handling
- ✅ Includes unit tests

## 13. Advanced Learning Extension

### Next-Level Patterns

**1. Chunked Processing for Large Arrays**
```typescript
async function processLargeArray<T>(
  items: T[],
  processor: (chunk: T[]) => Promise<void>,
  chunkSize: number = 100
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processor(chunk);
  }
}

// Usage: Process 10,000 tasks in chunks of 100
await processLargeArray(tasks, async (chunk) => {
  await db.task.updateMany({
    where: { id: { in: chunk.map(t => t.id) } },
    data: { status: 'ARCHIVED' }
  });
}, 100);
```

**2. Parallel Processing with Arrays**
```typescript
async function parallelProcessArray<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(processor)
    );
    results.push(...chunkResults);
  }
  
  return results;
}

// Process tasks with limited concurrency
const results = await parallelProcessArray(
  tasks,
  async (task) => await enrichTaskData(task),
  5  // Process 5 at a time
);
```

**3. Array-Based Caching Strategy**
```typescript
class ArrayCache<T> {
  private cache: Map<string, { data: T[]; expiry: number }> = new Map();
  
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T[]>,
    ttl: number = 300
  ): Promise<T[]> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000
    });
    
    return data;
  }
  
  invalidate(key: string) {
    this.cache.delete(key);
  }
}

// Usage
const taskCache = new ArrayCache<Task>();

const tasks = await taskCache.getOrFetch(
  `project:${projectId}:tasks`,
  () => db.task.findMany({ where: { projectId } }),
  300
);
```

**4. Optimistic Array Updates**
```typescript
// Frontend pattern: Update UI immediately, sync with backend
async function optimisticBulkUpdate(
  tasks: Task[],
  updates: Partial<Task>
): Promise<Task[]> {
  // 1. Immediate UI update
  const optimisticTasks = tasks.map(task => ({
    ...task,
    ...updates
  }));
  
  // 2. Background sync
  try {
    const serverTasks = await api.bulkUpdate(
      tasks.map(t => t.id),
      updates
    );
    return serverTasks;
  } catch (error) {
    // 3. Rollback on failure
    return tasks;
  }
}
```

---

## 📚 Further Reading

- **MDN Array Reference**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
- **Pagination Best Practices**: cursor-based vs offset-based
- **Database Bulk Operations**: `createMany`, `updateMany`, `deleteMany`
- **Array Performance**: V8 engine optimization

## Next Lesson

Continue to [Hash Maps - Fast Lookups and Caching](02-hashmaps.md)

---

**Remember:** Arrays are not just for storing data - they're about efficient batch processing, bulk operations, and scalable data manipulation. Master them in the context of real backend operations!
