# Multi-Tenant Architecture - Isolating Customer Data

> Design systems where thousands of customers share infrastructure while keeping their data completely separate

## 1. Core Multi-Tenant Concepts

### What is Multi-Tenancy?

Multi-tenancy is an architecture where a single application instance serves multiple customers (tenants) while keeping their data logically and/or physically isolated.

```
Single-Tenant (Bad for SaaS):
User A → App Instance A → DB A
User B → App Instance B → DB B
User C → App Instance C → DB C
(Cost: $$$, Scalability: Poor)

Multi-Tenant (Good for SaaS):
User A ─┐
User B  ├→ Single App Instance → Database (with isolation)
User C ─┘
(Cost: $, Scalability: Excellent)
```

### Isolation Levels

1. **Logical Isolation** - Shared schema, data filtered by tenant_id
2. **Physical Isolation** - Separate databases per tenant
3. **Network Isolation** - Separate infrastructure per tenant

## 2. Real-World Applications

### Strategy 1: Logical Isolation (Row-Level Security)

```typescript
// In your Jira-like platform
// Single tasks table for all organizations

// Any query MUST include the organization filter
const tasks = await db.task.findMany({
  where: {
    organizationId: currentUser.organizationId, // CRITICAL!
    projectId: projectId
  }
});

// Use middleware to enforce this globally
class TenantMiddleware {
  async enforce(req: Request, res: Response, next: NextFunction) {
    const organizationId = req.user.organizationId;
    
    // All subsequent queries inherit this context
    req.tenantId = organizationId;
    
    next();
  }
}

// Create a request-scoped tenant context
class TenantContext {
  static readonly TENANT_KEY = Symbol('tenantId');
  
  static set(tenantId: string): void {
    cls.set(TenantContext.TENANT_KEY, tenantId);
  }
  
  static get(): string {
    return cls.get(TenantContext.TENANT_KEY) || throw new Error('No tenant set');
  }
}

// Prisma middleware to automatically add tenant_id filter
prisma.$use(async (params, next) => {
  const tenantId = TenantContext.get();
  
  // Auto-add organizationId filter for certain models
  if (['task', 'project', 'user'].includes(params.model.toLowerCase())) {
    if (!params.where) params.where = {};
    
    // For nested queries, add tenant filter
    if (params.where.organizationId === undefined && 
        params.model !== 'Organization') {
      params.where.organizationId = tenantId;
    }
  }
  
  return next(params);
});
```

### Strategy 2: Physical Isolation (Separate Databases)

```typescript
// Each organization has its own database
class TenantDatabaseManager {
  private dbConnections = new Map<string, PrismaClient>();
  
  async getConnection(organizationId: string): Promise<PrismaClient> {
    if (this.dbConnections.has(organizationId)) {
      return this.dbConnections.get(organizationId)!;
    }
    
    // Get database URL for this tenant from config
    const dbUrl = await this.getTenantDatabaseUrl(organizationId);
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    });
    
    await prisma.$connect();
    this.dbConnections.set(organizationId, prisma);
    
    return prisma;
  }
  
  private async getTenantDatabaseUrl(organizationId: string): Promise<string> {
    // Could be stored in config server, environment, or main database
    const tenant = await mainDb.organization.findUnique({
      where: { id: organizationId }
    });
    
    return tenant.databaseUrl;
  }
  
  async executeQuery<T>(
    organizationId: string,
    query: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const db = await this.getConnection(organizationId);
    return query(db);
  }
}

// Usage in service
class TaskService {
  constructor(private dbManager: TenantDatabaseManager) {}
  
  async getTasks(organizationId: string, projectId: string): Promise<Task[]> {
    return this.dbManager.executeQuery(organizationId, async (db) => {
      return db.task.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      });
    });
  }
}
```

### Strategy 3: Hybrid Approach

```typescript
// Use shared schema for metadata, separate databases for tenant data
class HybridTenantManager {
  constructor(
    private mainDb: PrismaClient, // Metadata DB (all tenants)
    private tenantDbManager: TenantDatabaseManager
  ) {}
  
  async createOrganization(data: {
    name: string;
    plan: 'starter' | 'pro' | 'enterprise';
  }): Promise<Organization> {
    // 1. Create database for this tenant
    const databaseUrl = await this.provisionDatabase();
    
    // 2. Record in shared metadata database
    const org = await this.mainDb.organization.create({
      data: {
        ...data,
        databaseUrl,
        status: 'active'
      }
    });
    
    // 3. Initialize tenant database schema
    await this.initializeTenantDatabase(org.id);
    
    return org;
  }
  
  private async provisionDatabase(): Promise<string> {
    // Use Docker, Kubernetes, or cloud provider API
    // Returns: postgres://user:pass@host:5432/org_123
    const dbName = `org_${generateId()}`;
    
    // Create database in managed PostgreSQL cluster
    await execSQL(`CREATE DATABASE ${dbName};`);
    
    return `postgres://user:pass@db-pool:5432/${dbName}`;
  }
  
  private async initializeTenantDatabase(organizationId: string): Promise<void> {
    await this.tenantDbManager.executeQuery(organizationId, async (db) => {
      // Run migrations for this tenant's database
      await runMigrations(db);
    });
  }
}
```

## 3. Preventing Data Leaks

### Critical: Tenant ID Validation

```typescript
// ❌ DANGEROUS - Doesn't validate tenant
class UnsafeTaskController {
  async getTask(req: Request, res: Response) {
    const taskId = req.params.taskId;
    
    // User could pass ANY taskId and see anyone's task!
    const task = await db.task.findUnique({
      where: { id: taskId }
    });
    
    return res.json(task);
  }
}

// ✅ SAFE - Validates tenant
class SafeTaskController {
  async getTask(req: Request, res: Response) {
    const taskId = req.params.taskId;
    const organizationId = req.user.organizationId;
    
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    
    // Always validate ownership
    if (task.project.organizationId !== organizationId) {
      throw new ForbiddenException('Task not found');
    }
    
    return res.json(task);
  }
}
```

## 4. Tenant-Aware Repository Pattern

```typescript
interface ITenantRepository<T> {
  create(data: CreateData<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
}

class TaskRepository implements ITenantRepository<Task> {
  constructor(
    private db: PrismaClient,
    private organizationId: string
  ) {}
  
  async create(data: CreateTaskData): Promise<Task> {
    // Automatically adds organizationId
    return this.db.task.create({
      data: {
        ...data,
        organizationId: this.organizationId
      }
    });
  }
  
  async findById(id: string): Promise<Task | null> {
    const task = await this.db.task.findUnique({ where: { id } });
    
    // Validate tenant ownership
    if (task && task.organizationId !== this.organizationId) {
      return null; // Hide non-owned entities
    }
    
    return task;
  }
  
  async delete(id: string): Promise<void> {
    const task = await this.findById(id);
    
    if (!task || task.organizationId !== this.organizationId) {
      throw new ForbiddenException('Cannot delete task from another tenant');
    }
    
    await this.db.task.delete({ where: { id } });
  }
}

// Factory pattern for request-scoped repositories
class RepositoryFactory {
  constructor(private organizationId: string) {}
  
  createTaskRepository(): TaskRepository {
    return new TaskRepository(this.db, this.organizationId);
  }
  
  createProjectRepository(): ProjectRepository {
    return new ProjectRepository(this.db, this.organizationId);
  }
}
```

## 5. Database Schema for Multi-Tenancy

```sql
-- All tables include organization_id for logical isolation

CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL, -- starter, pro, enterprise
  database_url TEXT, -- For physical isolation
  created_at TIMESTAMP,
  UNIQUE(name)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP,
  UNIQUE(organization_id, name) -- Ensures unique names within org
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP
);

-- CRITICAL: Index on organization_id for all queries
CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_tasks_org_id ON tasks(organization_id);
CREATE INDEX idx_tasks_project_org ON tasks(organization_id, project_id);
```

## 6. Multi-Tenant Service

```typescript
class MultiTenantTaskService {
  constructor(
    private repositoryFactory: RepositoryFactory,
    private eventBus: EventBus
  ) {}
  
  async createTask(
    organizationId: string,
    projectId: string,
    data: CreateTaskData
  ): Promise<Task> {
    const repo = new RepositoryFactory(organizationId).createTaskRepository();
    
    // Validate project ownership
    const project = await repo.getProject(projectId);
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException('Project not found');
    }
    
    const task = await repo.create({
      ...data,
      projectId,
      organizationId
    });
    
    // Publish event only for this tenant
    await this.eventBus.publish({
      type: 'TaskCreated',
      organizationId,
      data: task
    });
    
    return task;
  }
  
  async searchTasks(
    organizationId: string,
    query: string
  ): Promise<Task[]> {
    const repo = new RepositoryFactory(organizationId).createTaskRepository();
    
    return repo.search(query);
  }
}
```

## 12. Practical Exercise

### Requirements
1. Create a multi-tenant task management API
2. Ensure strict data isolation between organizations
3. Validate all tenant access
4. Implement both logical and physical isolation options

### Implementation

```typescript
interface TenantDbStrategy {
  getConnection(organizationId: string): Promise<Database>;
}

class SharedDatabaseStrategy implements TenantDbStrategy {
  async getConnection(organizationId: string): Promise<Database> {
    // Returns shared database with tenant filtering
    return this.sharedDb;
  }
}

class SeparateDatabaseStrategy implements TenantDbStrategy {
  async getConnection(organizationId: string): Promise<Database> {
    // Returns organization-specific database
    return this.dbManager.getConnection(organizationId);
  }
}

class MultiTenantAPI {
  constructor(
    private strategy: TenantDbStrategy,
    private authService: AuthService
  ) {}
  
  async createTask(req: Request): Promise<Task> {
    // TODO: Implement multi-tenant task creation
    // 1. Validate tenant from JWT
    // 2. Get organization-specific connection
    // 3. Create task with validation
    // 4. Return created task
  }
  
  async getTasks(req: Request): Promise<Task[]> {
    // TODO: Implement multi-tenant task retrieval
    // 1. Validate tenant
    // 2. Query with automatic tenant filtering
    // 3. Return tenant's tasks only
  }
}
```

---

## Next Lesson

Continue to [Scalable Backend Design](02-scalable-backend-design.md)
