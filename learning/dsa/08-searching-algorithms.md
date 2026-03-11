# Searching Algorithms - Efficient Data Retrieval

> Master binary search, database optimization, and efficient query strategies

## 1. Core Searching Algorithms

### Linear Search - O(n)
```typescript
function linearSearch<T>(array: T[], target: T): number {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === target) {
      return i;
    }
  }
  return -1;
}

// Use case: Unsorted data, small datasets
```

### Binary Search - O(log n)
```typescript
function binarySearch<T>(sortedArray: T[], target: T): number {
  let left = 0;
  let right = sortedArray.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (sortedArray[mid] === target) {
      return mid;
    }
    
    if (sortedArray[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return -1;
}

// Use case: Sorted data, fast lookups
```

## 2. Real-World Applications

### Example 1: Pagination with Binary Search

```typescript
class PaginatedTaskSearch {
  async findTaskPage(
    projectId: string,
    targetPriority: number,
    pageSize: number
  ): Promise<{ tasks: Task[]; page: number }> {
    // Get all tasks sorted by priority
    const allTasks = await db.task.findMany({
      where: { projectId },
      orderBy: { priority: 'desc' }
    });
    
    // Binary search to find starting position
    let left = 0;
    let right = allTasks.length - 1;
    let position = 0;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      if (allTasks[mid].priority >= targetPriority) {
        position = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    // Calculate page number
    const page = Math.floor(position / pageSize) + 1;
    const skip = (page - 1) * pageSize;
    
    return {
      tasks: allTasks.slice(skip, skip + pageSize),
      page
    };
  }
}
```

### Example 2: Autocomplete Search

```typescript
class AutocompleteService {
  private tasks: Task[] = [];
  
  async initialize(projectId: string): Promise<void> {
    this.tasks = await db.task.findMany({
      where: { projectId },
      orderBy: { title: 'asc' }
    });
  }
  
  // Binary search to find range of matching titles
  search(prefix: string): Task[] {
    const start = this.findFirstMatch(prefix);
    if (start === -1) return [];
    
    const results: Task[] = [];
    for (let i = start; i < this.tasks.length; i++) {
      if (this.tasks[i].title.toLowerCase().startsWith(prefix.toLowerCase())) {
        results.push(this.tasks[i]);
      } else {
        break;
      }
    }
    
    return results.slice(0, 10); // Limit to 10 results
  }
  
  private findFirstMatch(prefix: string): number {
    let left = 0;
    let right = this.tasks.length - 1;
    let result = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const title = this.tasks[mid].title.toLowerCase();
      
      if (title.startsWith(prefix.toLowerCase())) {
        result = mid;
        right = mid - 1; // Look for earlier matches
      } else if (title < prefix.toLowerCase()) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result;
  }
}
```

### Example 3: Database Indexing Strategy

```sql
-- Create indexes for common searches
CREATE INDEX idx_tasks_project_priority ON tasks(project_id, priority DESC);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at DESC);

-- Full-text search index
CREATE INDEX idx_tasks_title_search ON tasks USING gin(to_tsvector('english', title));

-- Search with index
SELECT * FROM tasks
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'urgent & bug')
ORDER BY priority DESC
LIMIT 20;
```

### Example 4: Efficient User Search

```typescript
class UserSearchService {
  async searchUsers(
    organizationId: string,
    query: string,
    filters: {
      role?: string;
      department?: string;
    }
  ): Promise<User[]> {
    // Use database indexes for efficient search
    const users = await db.user.findMany({
      where: {
        organizationId,
        ...(filters.role && { role: filters.role }),
        ...(filters.department && { department: filters.department }),
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 50,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });
    
    return users;
  }
  
  // Redis cache for frequent searches
  async searchWithCache(
    organizationId: string,
    query: string
  ): Promise<User[]> {
    const cacheKey = `user-search:${organizationId}:${query}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Search database
    const users = await this.searchUsers(organizationId, query, {});
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(users));
    
    return users;
  }
}
```

## 3. Search Optimization Strategies

### 1. Database Indexes
```typescript
// Always use indexes for WHERE, JOIN, ORDER BY
// Check query plans
const explain = await db.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM tasks
  WHERE project_id = '123' AND priority > 5
  ORDER BY created_at DESC;
`;
```

### 2. Caching Frequent Searches
```typescript
class SearchCacheService {
  async search<T>(
    cacheKey: string,
    searchFn: () => Promise<T>
  ): Promise<T> {
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const results = await searchFn();
    await redis.setex(cacheKey, 300, JSON.stringify(results));
    
    return results;
  }
}
```

### 3. Pagination
```typescript
// Cursor-based pagination (better for large datasets)
async function getPaginatedTasks(
  projectId: string,
  cursor?: string,
  limit: number = 20
): Promise<{ tasks: Task[]; nextCursor?: string }> {
  const tasks = await db.task.findMany({
    where: {
      projectId,
      ...(cursor && { id: { lt: cursor } })
    },
    take: limit + 1,
    orderBy: { createdAt: 'desc' }
  });
  
  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, -1) : tasks;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;
  
  return { tasks: items, nextCursor };
}
```

## 12. Practical Exercise

### Task: Build an Advanced Search System

**Requirements:**
1. Full-text search across tasks
2. Filter by multiple criteria
3. Sort by relevance
4. Pagination support
5. Cache frequent searches
6. Highlight search terms in results

**Implementation:**

```typescript
interface SearchQuery {
  text?: string;
  status?: string[];
  priority?: { min: number; max: number };
  assignee?: string;
  dateRange?: { start: Date; end: Date };
}

interface SearchResult {
  tasks: Task[];
  total: number;
  page: number;
  hasMore: boolean;
}

class AdvancedSearchService {
  async search(
    projectId: string,
    query: SearchQuery,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult> {
    // TODO: Implement advanced search
    // Use database indexes
    // Cache results
    // Return paginated results
  }
  
  async autocomplete(projectId: string, prefix: string): Promise<string[]> {
    // TODO: Autocomplete task titles
  }
}
```

**Success Criteria:**
- ✅ Fast searches (<100ms)
- ✅ Supports complex filters
- ✅ Efficient pagination
- ✅ Cached results
- ✅ Relevance ranking

---

## Next Lesson

Continue to [Sorting Algorithms](09-sorting-algorithms.md)
