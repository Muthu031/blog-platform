# Database Optimization - Scaling Your Data Layer

> Master query optimization, indexing, replication, and partitioning for massive datasets

## 1. Core Concepts

### Query Performance Fundamentals

```
Without optimization: 1M database queries/second
- CPU: 100% (maxed out)
- Latency: 500ms per request
- Throughput: 100 reqs/sec

With optimization: 1M queries/second
- CPU: 20% (lots of headroom)
- Latency: 5ms per request
- Throughput: 10,000 reqs/sec
(That's 100x improvement!)
```

## 2. Real-World Applications

### Example 1: Query Optimization with EXPLAIN

```typescript
// Analyze query performance before optimization
class QueryOptimization {
  async slowQuery(): Promise<Task[]> {
    // ❌ SLOW: Full table scan
    const tasks = await db.task.findMany({
      where: {
        title: 'bugs', // Not indexed!
        status: 'open'
      }
    });
    
    // Check execution plan
    const plan = await db.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM tasks
      WHERE title LIKE '%bugs%' AND status = 'open'
    `;
    
    // Plan shows: Seq Scan on tasks (1,000,000 rows scanned!)
    // Execution time: 500ms
  }
  
  async optimizedQuery(): Promise<Task[]> {
    // ✅ FAST: Using indexes
    // Create indexes first
    await db.$executeRaw`
      CREATE INDEX idx_tasks_status_title ON tasks(status, title);
    `;
    
    // Now same query uses index
    const tasks = await db.task.findMany({
      where: {
        title: 'bugs',
        status: 'open'
      }
    });
    
    // Plan shows: Index Scan (10 rows scanned)
    // Execution time: 5ms (100x faster!)
  }
}
```

### Example 2: Indexing Strategy

```typescript
// Different index types for different queries
class IndexingStrategy {
  async setupIndexes(): Promise<void> {
    // 1. Single column index (for WHERE clauses)
    await db.$executeRaw`
      CREATE INDEX idx_tasks_status ON tasks(status);
      CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
    `;
    
    // 2. Composite index (for multiple WHERE clauses)
    await db.$executeRaw`
      CREATE INDEX idx_tasks_org_status ON tasks(organization_id, status);
    `;
    
    // 3. Covering index (includes SELECT columns)
    await db.$executeRaw`
      CREATE INDEX idx_tasks_covering ON tasks(status, priority)
      INCLUDE (title, assignee_id);
    `;
    
    // 4. Partial index (for WHERE with conditions)
    await db.$executeRaw`
      CREATE INDEX idx_tasks_active ON tasks(id)
      WHERE status != 'closed';
    `;
    
    // 5. Full-text search index
    await db.$executeRaw`
      CREATE INDEX idx_tasks_search ON tasks
      USING GIN(to_tsvector('english', title), to_tsvector('english', description));
    `;
  }
  
  // Query strategies
  async getActiveTasks(organizationId: string): Promise<Task[]> {
    // Uses idx_tasks_org_status
    return db.task.findMany({
      where: {
        organizationId,
        NOT: { status: 'closed' }
      }
    });
  }
  
  async searchTasks(organizationId: string, query: string): Promise<Task[]> {
    // Uses idx_tasks_search
    return db.$queryRaw`
      SELECT * FROM tasks
      WHERE organization_id = ${organizationId}
      AND (
        to_tsvector('english', title) @@ to_tsquery('english', ${query})
        OR to_tsvector('english', description) @@ to_tsquery('english', ${query})
      )
    `;
  }
}
```

### Example 3: Read Replicas

```typescript
// Master-slave replication for read scaling
class ReadReplicaService {
  constructor(
    private primaryDb: Database, // Master (writes)
    private readReplicas: Database[] // Slaves (reads)
  ) {}
  
  async createTask(data: CreateTaskData): Promise<Task> {
    // Always write to primary
    return this.primaryDb.task.create({ data });
  }
  
  async getTasks(organizationId: string): Promise<Task[]> {
    // Read from replica (less load on primary)
    const replica = this.selectRandomReplica();
    
    return replica.task.findMany({
      where: { organizationId }
    });
  }
  
  async getTaskWithFallback(taskId: string): Promise<Task> {
    try {
      // Try replica first
      return await this.selectRandomReplica().task.findUnique({
        where: { id: taskId }
      });
    } catch (error) {
      // If replica is behind, fallback to primary
      return this.primaryDb.task.findUnique({
        where: { id: taskId }
      });
    }
  }
  
  private selectRandomReplica(): Database {
    const index = Math.floor(Math.random() * this.readReplicas.length);
    return this.readReplicas[index];
  }
}
```

### Example 4: Partitioning (Sharding by Date)

```typescript
// For tables with millions of rows, partition by date
class PartitionedActivityLog {
  async logActivity(data: ActivityData): Promise<void> {
    // Determine partition based on date
    const date = new Date();
    const partitionName = `activity_log_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Insert into appropriate partition
    await db.$executeRaw`
      INSERT INTO ${partitionName} (organization_id, action, timestamp, data)
      VALUES (${data.organizationId}, ${data.action}, ${date}, ${JSON.stringify(data)})
    `;
  }
  
  async createPartitions(): Promise<void> {
    // Create partition for each month
    for (let month = 1; month <= 12; month++) {
      const partitionName = `activity_log_2026_${String(month).padStart(2, '0')}`;
      
      await db.$executeRaw`
        CREATE TABLE ${partitionName} PARTITION OF activity_log
        FOR VALUES FROM ('2026-${String(month).padStart(2, '0')}-01')
                     TO ('2026-${String(month + 1).padStart(2, '0')}-01')
      `;
    }
  }
  
  async queryActivities(organizationId: string, month: number): Promise<Activity[]> {
    // Query only relevant partition
    const partitionName = `activity_log_2026_${String(month).padStart(2, '0')}`;
    
    return db.$queryRaw`
      SELECT * FROM ${partitionName}
      WHERE organization_id = ${organizationId}
      ORDER BY timestamp DESC
    `;
  }
}
```

### Example 5: Query Optimization Patterns

```typescript
// N+1 Problem
class N_Plus_1_Problem {
  async getProjectsWithTasks_BadWay(): Promise<ProjectWithTasks[]> {
    const projects = await db.project.findMany(); // 1 query
    
    const result = [];
    for (const project of projects) {
      // 1 query per project = N+1!
      const tasks = await db.task.findMany({
        where: { projectId: project.id }
      });
      
      result.push({ ...project, tasks });
    }
    
    return result;
    // Total: 1 + N queries (if 100 projects: 101 queries!)
  }
  
  async getProjectsWithTasks_GoodWay(): Promise<ProjectWithTasks[]> {
    // Use JOIN or include (1 query)
    return db.project.findMany({
      include: {
        tasks: true // Uses JOIN
      }
    });
    // Total: 1 query (massive improvement!)
  }
}

// Pagination for large datasets
class PaginationOptimization {
  async paginate<T>(
    query: (skip: number, take: number) => Promise<T[]>,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ items: T[]; total: number; pages: number }> {
    const offset = (page - 1) * pageSize;
    
    // Get count (can be slow for large tables)
    const total = await this.getCachedCount();
    
    // Get paginated data
    const items = await query(offset, pageSize);
    
    return {
      items,
      total,
      pages: Math.ceil(total / pageSize)
    };
  }
  
  // Better: Cursor-based pagination (no COUNT needed)
  async cursorPaginate<T>(
    query: (cursor?: string, limit: number) => Promise<T[]>,
    cursor?: string,
    limit: number = 20
  ): Promise<{ items: T[]; nextCursor?: string }> {
    // Fetch limit + 1 to check if more exists
    const items = await query(cursor, limit + 1);
    
    const hasMore = items.length > limit;
    const result = hasMore ? items.slice(0, -1) : items;
    const nextCursor = hasMore ? result[result.length - 1].id : undefined;
    
    return { items: result, nextCursor };
  }
}
```

## 3. Connection Pooling

```typescript
// Manage database connections efficiently
class ConnectionPool {
  private pool: pg.Pool;
  
  constructor() {
    this.pool = new pg.Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Max 20 connections
      min: 5, // Keep 5 warm
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }
  
  async query<T>(sql: string, params: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release(); // Return to pool
    }
  }
}
```

## 12. Practical Exercise

### Build a Highly Optimized Query System

**Requirements:**
1. Analyze and optimize slow queries
2. Create appropriate indexes
3. Implement read replicas
4. Handle pagination efficiently
5. Monitor query performance

### Structure

```typescript
class OptimizedDatabaseSystem {
  async analyzeQuery(sql: string): Promise<ExecutionPlan> {
    // TODO: Use EXPLAIN ANALYZE
  }
  
  async optimizeQuery(taskId: string): Promise<QueryOptimization> {
    // TODO: Add indexes and re-write query
  }
  
  async setupReadReplicas(): Promise<void> {
    // TODO: Configure master-slave replication
  }
  
  async implementPagination(): Promise<void> {
    // TODO: Cursor-based pagination
  }
}
```

---

## Next Lesson

Continue to [Caching Strategies](06-caching-strategies.md)
