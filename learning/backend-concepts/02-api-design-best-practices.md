# API Design & Best Practices - Building Clear, Usable APIs

> Design endpoints that are intuitive, documented, and scalable

## 1. Core Concepts

### RESTful Principles

```
REST = Representational State Transfer

Resources (nouns):
/organizations
/organizations/{id}
/organizations/{id}/projects
/organizations/{id}/projects/{projectId}/tasks

Operations (verbs - HTTP methods):
GET    - Retrieve
POST   - Create
PUT    - Replace entire resource
PATCH  - Partial update
DELETE - Delete
```

## 2. Real-World Applications

### Example 1: RESTful Endpoint Design

```typescript
// ❌ Bad API design (verbs in URLs)
GET /getUsers
POST /createUser
GET /deleteUser?id=123

// ✅ Good API design (nouns, HTTP verbs)
GET /users
POST /users
DELETE /users/{id}

class TaskAPI {
  // Get all tasks
  async listTasks(
    organizationId: string,
    query: {
      skip?: number;
      take?: number;
      status?: string;
      sortBy?: 'priority' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ tasks: Task[]; total: number }> {
    const { skip = 0, take = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where: {
          organizationId,
          ...(status && { status })
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder }
      }),
      db.task.count({
        where: {
          organizationId,
          ...(status && { status })
        }
      })
    ]);
    
    return { tasks, total };
  }
  
  // Create task
  async createTask(
    organizationId: string,
    data: CreateTaskData
  ): Promise<Task> {
    return db.task.create({
      data: {
        ...data,
        organizationId
      }
    });
  }
  
  // Get single task
  async getTask(organizationId: string, taskId: string): Promise<Task> {
    const task = await db.task.findUnique({ where: { id: taskId } });
    
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundError('Task not found');
    }
    
    return task;
  }
  
  // Update task
  async updateTask(
    organizationId: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task> {
    await this.validateOwnership(organizationId, taskId);
    
    return db.task.update({
      where: { id: taskId },
      data: updates
    });
  }
  
  // Delete task
  async deleteTask(organizationId: string, taskId: string): Promise<void> {
    await this.validateOwnership(organizationId, taskId);
    
    await db.task.delete({ where: { id: taskId } });
  }
}
```

### Example 2: Pagination

```typescript
// Offset-based pagination (simple, but slow for large offsets)
class OffsetPagination {
  async getPage(skip: number, take: number): Promise<Task[]> {
    return db.task.findMany({
      skip, // Skip N items
      take  // Take N items
    });
  }
  
  // Problem: SELECT * FROM tasks LIMIT 100000, 20 scans 100000 rows!
}

// ✅ Cursor-based pagination (efficient at scale)
class CursorPagination {
  async getPage(cursor?: string, take: number = 20): Promise<{ items: Task[]; cursor?: string }> {
    // Fetch take + 1 to check if more exists
    const items = await db.task.findMany({
      ...(cursor && {
        skip: 1, // Skip the cursor itself
        cursor: { id: cursor }
      }),
      take: take + 1,
      orderBy: { createdAt: 'desc' }
    });
    
    const hasMore = items.length > take;
    const result = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? result[result.length - 1]?.id : undefined;
    
    return { items: result, cursor: nextCursor };
  }
}
```

### Example 3: Filtering & Sorting

```typescript
interface TaskFilter {
  status?: string[];
  priority?: number;
  assigneeId?: string;
  createdAfter?: Date;
  search?: string;
}

class FilteredSearch {
  async searchTasks(
    organizationId: string,
    filter: TaskFilter,
    sort: { field: string; order: 'asc' | 'desc' } = { field: 'createdAt', order: 'desc' }
  ): Promise<Task[]> {
    return db.task.findMany({
      where: {
        organizationId,
        ...(filter.status && { status: { in: filter.status } }),
        ...(filter.priority && { priority: { gte: filter.priority } }),
        ...(filter.assigneeId && { assigneeId: filter.assigneeId }),
        ...(filter.createdAfter && { createdAt: { gte: filter.createdAfter } }),
        ...(filter.search && {
          OR: [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { [sort.field]: sort.order }
    });
  }
}
```

### Example 4: API Versioning

```typescript
// V1: Original API
class TaskAPiv1 {
  async getTasks(): Promise<Task[]> {
    // Returns task objects
  }
}

// V2: Add new fields (backwards compatible)
class TaskAPiv2 {
  async getTasks(): Promise<TaskV2[]> {
    // Now includes computed fields: estimatedMinutes, teamSize
  }
}

// V3: Breaking change (remove deprecated fields)
class TaskAPiv3 {
  async getTasks(): Promise<TaskV3[]> {
    // Removed: oldField (was deprecated in V2)
  }
}

// Router directing to correct version
class APIRouter {
  handleRequest(req: Request): Response {
    const version = req.headers['api-version'] || 'v1';
    
    switch (version) {
      case 'v1': return this.routeV1(req);
      case 'v2': return this.routeV2(req);
      case 'v3': return this.routeV3(req);
      default: return this.routeLatest(req);
    }
  }
}
```

### Example 5: Response Format

```typescript
// ✅ Consistent response format
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

class ResponseBuilder {
  success<T>(data: T, meta?: any): APIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date(),
        requestId: generateId(),
        version: '1.0',
        ...meta
      }
    };
  }
  
  error(code: string, message: string, details?: any): APIResponse<null> {
    return {
      success: false,
      error: { code, message, details },
      meta: {
        timestamp: new Date(),
        requestId: generateId(),
        version: '1.0'
      }
    };
  }
}
```

### Example 6: Error Handling

```typescript
class APIErrorHandling {
  async handleTaskEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const task = await this.getTask(req.params.id);
      res.json(this.responseBuilder.success(task));
    } catch (error) {
      // Categorize and return appropriate error
      if (error instanceof ValidationError) {
        res.status(400).json(
          this.responseBuilder.error('VALIDATION_ERROR', error.message)
        );
      } else if (error instanceof ForbiddenError) {
        res.status(403).json(
          this.responseBuilder.error('FORBIDDEN', 'You do not have access')
        );
      } else if (error instanceof NotFoundError) {
        res.status(404).json(
          this.responseBuilder.error('NOT_FOUND', 'Resource not found')
        );
      } else {
        // Never expose internal errors to client
        res.status(500).json(
          this.responseBuilder.error('INTERNAL_ERROR', 'Something went wrong')
        );
      }
    }
  }
}
```

### Example 7: OpenAPI Documentation

```typescript
// Swagger annotation
/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: List tasks
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: skip
 *         in: query
 *         schema:
 *           type: number
 *       - name: take
 *         in: query
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 total:
 *                   type: number
 */
async getTasks(req: Request, res: Response): Promise<void> {
  // Implementation
}
```

## 3. Rate Limiting

```typescript
class RateLimiting {
  async enforceRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user.id;
    const key = `ratelimit:${userId}`;
    
    // Get current count
    const currentCount = await this.redis.incr(key);
    
    if (currentCount === 1) {
      // First request in window, set expiry
      await this.redis.expire(key, 60); // 1 minute window
    }
    
    const maxRequests = 100; // 100 requests per minute
    
    if (currentCount > maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: 60
      });
      return;
    }
    
    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - currentCount).toString(),
      'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
    });
    
    next();
  }
}
```

## 12. Practical Exercise

### Build a Complete API with Best Practices

**Requirements:**
1. Design RESTful endpoints
2. Implement pagination
3. Add filtering and sorting
4. Version your API
5. Document with Swagger
6. Implement rate limiting
7. Consistent error handling

### Structure

```typescript
class TaskAPI {
  async listTasks(query: TaskQuery): Promise<PaginatedResponse<Task>> {
    // TODO: Implement pagination, filtering, sorting
  }
  
  async createTask(data: CreateTaskData): Promise<Task> {
    // TODO: Validate and create
  }
  
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    // TODO: Update with validation
  }
  
  async deleteTask(id: string): Promise<void> {
    // TODO: Delete safely
  }
}
```

---

## Next Lesson

Continue to [Security & Authentication](03-security-authentication.md)
