# Lesson 4: Database Query Optimization

## 🎯 Goal
Optimize database queries to improve performance and reduce load.

## 📚 What You'll Learn
- Query optimization techniques
- Index strategies
- N+1 query prevention
- Query performance monitoring

## 📋 Prerequisites
- Completed Phase 4 Lessons 1-3
- Prisma ORM working
- PostgreSQL database running

## 🛠️ Tasks

### 1. Analyze and Optimize Queries

Create `backend/src/services/queryOptimizer.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class QueryOptimizer {
  /**
   * Get organization with optimal includes
   */
  static async getOrganizationOptimized(orgId: string) {
    // Good: Specific include to avoid N+1
    return prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get tasks with minimal data
   */
  static async getTasksOptimized(columnId: string) {
    return prisma.task.findMany({
      where: { columnId },
      select: {
        id: true,
        title: true,
        taskNumber: true,
        position: true,
        assigneeId: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { position: 'asc' }
    });
  }

  /**
   * Count tasks by column efficiently
   */
  static async getColumnTaskCounts(projectId: string) {
    return prisma.boardColumn.findMany({
      where: {
        board: { projectId }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { tasks: true }
        }
      }
    });
  }

  /**
   * Batch query to avoid N+1
   */
  static async getProjectsWithMembers(orgId: string) {
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    // Batch fetch member counts instead of in loop
    const memberCounts = await Promise.all(
      projects.map(project =>
        prisma.projectMember.count({
          where: { projectId: project.id }
        })
      )
    );

    return projects.map((project, index) => ({
      ...project,
      memberCount: memberCounts[index]
    }));
  }

  /**
   * Aggregate query to get stats
   */
  static async getProjectStats(projectId: string) {
    const stats = await prisma.task.groupBy({
      by: ['columnId'],
      where: { projectId },
      _count: {
        id: true
      }
    });

    return stats;
  }
}
```

### 2. Create Database Indexes

Create migration file `backend/prisma/migrations/add-performance-indexes/migration.sql`:

```sql
-- Organization indexes
CREATE INDEX idx_organization_slug ON "Organization"(slug);
CREATE INDEX idx_organization_created_at ON "Organization"("createdAt");

-- Project indexes
CREATE INDEX idx_project_organization_id ON "Project"("organizationId");
CREATE INDEX idx_project_slug ON "Project"(slug);
CREATE INDEX idx_project_created_by ON "Project"("createdById");

-- Task indexes
CREATE INDEX idx_task_project_id ON "Task"("projectId");
CREATE INDEX idx_task_column_id ON "Task"("columnId");
CREATE INDEX idx_task_assignee_id ON "Task"("assigneeId");
CREATE INDEX idx_task_position ON "Task"("columnId", position);

-- Board indexes
CREATE INDEX idx_board_project_id ON "Board"("projectId");

-- BoardColumn indexes
CREATE INDEX idx_board_column_board_id ON "BoardColumn"("boardId");
CREATE INDEX idx_board_column_position ON "BoardColumn"("boardId", position);

-- Comment indexes
CREATE INDEX idx_comment_task_id ON "Comment"("taskId");
CREATE INDEX idx_comment_author_id ON "Comment"("authorId");
CREATE INDEX idx_comment_created_at ON "Comment"("createdAt");

-- Activity log indexes
CREATE INDEX idx_activity_log_entity ON "ActivityLog"("entityType", "entityId");
CREATE INDEX idx_activity_log_user_id ON "ActivityLog"("userId");
CREATE INDEX idx_activity_log_created_at ON "ActivityLog"("createdAt");

-- Composite indexes for common queries
CREATE INDEX idx_org_member_lookup ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX idx_task_board_lookup ON "Task"("columnId", "position");
```

### 3. Query Performance Monitoring

Create `backend/src/services/queryMonitor.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class QueryMonitor {
  private static slowQueryThreshold = 100; // ms

  /**
   * Enable query logging
   */
  static enableLogging(prisma: PrismaClient) {
    prisma.$on('query', (e: any) => {
      if (e.duration > this.slowQueryThreshold) {
        console.warn(`[SLOW QUERY] ${e.query} took ${e.duration}ms`);
      }
    });
  }

  /**
   * Explain query plan
   */
  static async explainQuery(query: string) {
    const prisma = new PrismaClient();
    try {
      const result = await prisma.$queryRaw`EXPLAIN ${query}`;
      return result;
    } finally {
      await prisma.$disconnect();
    }
  }
}
```

### 4. Implement Pagination

Create `backend/src/shared/utils/pagination.ts`:

```typescript
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export class Pagination {
  static parseParams(query: any): PaginationParams {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));

    return { page, limit };
  }

  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static async paginate<T>(
    fetcher: (skip: number, take: number) => Promise<T[]>,
    counter: () => Promise<number>,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<T>> {
    const skip = this.getSkip(page, limit);
    const [data, total] = await Promise.all([
      fetcher(skip, limit),
      counter()
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total
      }
    };
  }
}
```

### 5. Update Controllers with Optimization

```typescript
import { Pagination } from '../../shared/utils/pagination';

// GET /api/projects/:projectId/tasks
router.get('/:projectId/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const params = Pagination.parseParams(req.query);

    const paginated = await Pagination.paginate(
      (skip, take) =>
        prisma.task.findMany({
          where: { projectId: req.params.projectId },
          select: {
            id: true,
            title: true,
            taskNumber: true,
            assignee: { select: { id: true, name: true } }
          },
          skip,
          take,
          orderBy: { taskNumber: 'desc' }
        }),
      () =>
        prisma.task.count({
          where: { projectId: req.params.projectId }
        }),
      params.page,
      params.limit
    );

    res.json(paginated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## ✅ Verification Checklist

- [ ] Queries use select instead of full includes
- [ ] N+1 queries are prevented with batch operations
- [ ] Indexes are created on foreign keys
- [ ] Pagination is implemented for large result sets
- [ ] Slow queries are logged
- [ ] Query plans are analyzed
- [ ] Composite indexes improve common queries
- [ ] Database performance improved
- [ ] Query response time is tracked
- [ ] No unnecessary data transfer

## 📚 Resources

- [Prisma Query Optimization](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Database Query Performance](https://use-the-index-luke.com/)
