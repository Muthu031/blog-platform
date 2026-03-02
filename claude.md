# 🏗️ Multi-Tenant SaaS Project Management Platform
## Architecture & Implementation Guide

> **Senior-Level Technical Documentation**
> A production-grade, scalable project management platform demonstrating full-stack mastery

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Core Domain Model](#core-domain-model)
3. [Architecture Decisions](#architecture-decisions)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Security Architecture](#security-architecture)
7. [Multi-Tenancy Pattern](#multi-tenancy-pattern)
8. [Caching Strategy](#caching-strategy)
9. [Real-Time Architecture](#real-time-architecture)
10. [File Upload Strategy](#file-upload-strategy)
11. [Background Jobs](#background-jobs)
12. [Testing Strategy](#testing-strategy)
13. [DevOps & Deployment](#devops--deployment)
14. [Observability](#observability)
15. [Implementation Phases](#implementation-phases)

---

## 🎯 Project Overview

### What Are We Building?

A **Multi-Tenant SaaS Project Management Platform** that combines:
- **Jira**: Task tracking, workflows, sprints
- **Trello**: Kanban boards, drag-and-drop
- **Notion**: Collaborative workspace, rich content

### Why This Project?

This project is specifically designed to cover **every major concept** in the roadmap.sh full-stack path:

| Category | Technologies | Concepts Covered |
|----------|--------------|------------------|
| Frontend | React, TypeScript | State management, Real-time updates, Optimistic UI |
| Backend | Node.js, Express, TypeScript | Clean architecture, SOLID principles, Design patterns |
| Database | PostgreSQL | Normalization, Indexing, Transactions, Query optimization |
| Caching | Redis | Session management, Query caching, Rate limiting |
| Real-Time | Socket.io | WebSockets, Event broadcasting, Presence |
| Storage | AWS S3 | File uploads, Signed URLs, CDN |
| Queue | BullMQ | Background jobs, Scheduled tasks, Retry logic |
| DevOps | Docker, GitHub Actions, AWS | CI/CD, Infrastructure as Code, Deployment |
| Testing | Jest, Supertest, RTL | Unit, Integration, E2E testing |
| Monitoring | Winston, Prometheus | Logging, Metrics, Alerting |

### Success Criteria

By completing this project, you will be able to confidently answer interview questions about:
- Designing scalable multi-tenant systems
- Implementing role-based access control (RBAC)
- Optimizing database queries at scale
- Building real-time collaborative features
- Securing API endpoints against common vulnerabilities
- Deploying production-grade infrastructure

---

## 🧠 Core Domain Model

### Domain Entities

```
Organization (Tenant)
  ├── Users (Members)
  │     └── Roles (Owner, Admin, Member, Guest)
  │
  ├── Projects
  │     ├── Boards
  │     │     └── Columns
  │     │           └── Tasks
  │     │                 ├── Comments
  │     │                 ├── Attachments
  │     │                 ├── Activity Logs
  │     │                 └── Assignees
  │     │
  │     └── Sprints (Optional)
  │
  └── Invitations
```

### Why This Structure?

**Senior-level reasoning:**

1. **Organization as Tenant Boundary**: All data is scoped to an organization. This ensures:
   - Data isolation (security)
   - Horizontal scalability (shard by org_id)
   - Clear billing boundaries

2. **Projects as Workspaces**: Organizations can have multiple isolated projects, just like in Jira or GitHub.

3. **Boards for Flexibility**: Multiple board views per project (Kanban, Timeline, Calendar).

4. **Tasks as Core Entity**: Everything revolves around tasks—they're the unit of work.

5. **Activity Logs for Audit Trail**: Critical for compliance and debugging.

### Key Relationships

```
User ──< OrganizationMember >── Organization
  │
  └── Task (assignee)

Organization ──< Project ──< Board ──< Column ──< Task
                                                    │
                                                    ├── Comment
                                                    ├── Attachment
                                                    └── ActivityLog
```

---

## 🏛️ Architecture Decisions

### 1. Clean Architecture (Layered Approach)

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (Controllers, Middleware)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Application Layer           │
│         (Use Cases, DTOs)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Domain Layer               │
│     (Business Logic, Entities)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Infrastructure Layer         │
│   (Database, External Services)     │
└─────────────────────────────────────┘
```

**Reasoning:**
- **Testability**: Each layer can be tested independently
- **Maintainability**: Changes in one layer don't affect others
- **Scalability**: Easy to swap implementations (e.g., switch from PostgreSQL to MongoDB)

### 2. Modular Monolith (Not Microservices... Yet)

**Decision**: Start with a monolith, structure as modules.

**Why?**
- **Early Stage**: Microservices add complexity without benefits at small scale
- **Faster Development**: Shared database, no network latency between services
- **Easy Refactoring**: Modules can be extracted to microservices later

**Module Structure:**

```typescript
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── dto/
│   │   └── tests/
│   │
│   ├── organization/
│   ├── project/
│   ├── board/
│   ├── task/
│   ├── comment/
│   └── user/
│
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── utils/
│   ├── types/
│   └── decorators/
│
├── config/
│   ├── database.ts
│   ├── redis.ts
│   ├── aws.ts
│   └── env.ts
│
└── app.ts
```

### 3. Tech Stack Decisions

| Layer | Technology | Why? |
|-------|-----------|------|
| **Frontend** | React 18 + TypeScript | Industry standard, great ecosystem, type safety |
| **State Management** | Zustand + React Query | Simpler than Redux, excellent server state management |
| **Backend** | Node.js + Express + TypeScript | JavaScript everywhere, huge ecosystem, type safety |
| **Database** | PostgreSQL 15 | ACID guarantees, excellent for relational data, JSON support |
| **ORM** | Prisma | Type-safe, great DX, migration management |
| **Cache** | Redis 7 | Fast, versatile, reliable |
| **Real-Time** | Socket.io | Easy to use, fallbacks to polling, room support |
| **Queue** | BullMQ | Redis-based, reliable, good monitoring |
| **File Storage** | AWS S3 | Scalable, cheap, industry standard |
| **Deployment** | Docker + AWS ECS/EC2 | Containerization, auto-scaling |
| **CI/CD** | GitHub Actions | Free, integrated, easy to configure |

**Alternative Considerations:**

- **tRPC instead of REST**: Great for monorepo, but REST is more universal
- **Serverless (Lambda)**: Would reduce costs, but cold starts hurt UX
- **GraphQL instead of REST**: Powerful, but adds complexity for CRUD operations
- **MongoDB instead of PostgreSQL**: Flexible schema, but we need ACID transactions

---

## 🗄️ Database Design

### Schema Design (PostgreSQL)

```sql
-- ============================================
-- ORGANIZATIONS (Tenant Boundary)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- soft delete
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted ON organizations(deleted_at);

-- ============================================
-- USERS (Global, not per tenant)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted ON users(deleted_at);

-- ============================================
-- ORGANIZATION MEMBERS (Tenant + User Join)
-- ============================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- owner, admin, member, guest
  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(10) NOT NULL, -- e.g., "PROJ" for task keys like PROJ-123
  description TEXT,
  color VARCHAR(7), -- hex color
  icon TEXT,
  visibility VARCHAR(20) DEFAULT 'private', -- private, organization, public
  archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(organization_id, key)
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_archived ON projects(archived);

-- ============================================
-- BOARDS (Multiple views per project)
-- ============================================
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'kanban', -- kanban, list, timeline, calendar
  settings JSONB DEFAULT '{}',
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boards_project ON boards(project_id);

-- ============================================
-- COLUMNS (Board columns)
-- ============================================
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  color VARCHAR(7),
  wip_limit INTEGER, -- work in progress limit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_columns_board ON columns(board_id);
CREATE INDEX idx_columns_position ON columns(board_id, position);

-- ============================================
-- TASKS (Core entity)
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  task_number INTEGER NOT NULL, -- Auto-increment per project
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  type VARCHAR(50) DEFAULT 'task', -- task, bug, story, epic
  position INTEGER NOT NULL,

  -- Relationships
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  parent_task_id UUID REFERENCES tasks(id), -- For subtasks

  -- Metadata
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  due_date DATE,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  UNIQUE(project_id, task_number)
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_position ON tasks(column_id, position);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- ============================================
-- TASK LABELS (Many-to-Many)
-- ============================================
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,

  UNIQUE(project_id, name)
);

CREATE TABLE task_labels (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,

  PRIMARY KEY(task_id, label_id)
);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id), -- For nested comments

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- ============================================
-- ATTACHMENTS
-- ============================================
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),

  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  storage_key TEXT NOT NULL, -- S3 key
  url TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),

  CHECK (task_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_comment ON attachments(comment_id);

-- ============================================
-- ACTIVITY LOGS (Audit trail)
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, moved, commented
  entity_type VARCHAR(50) NOT NULL, -- task, project, comment
  entity_id UUID NOT NULL,

  changes JSONB, -- { "field": "status", "from": "todo", "to": "done" }
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_org ON activity_logs(organization_id, created_at DESC);
CREATE INDEX idx_activity_project ON activity_logs(project_id, created_at DESC);
CREATE INDEX idx_activity_task ON activity_logs(task_id, created_at DESC);
CREATE INDEX idx_activity_user ON activity_logs(user_id);

-- ============================================
-- INVITATIONS
-- ============================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
```

### Database Design Principles

#### 1. **Multi-Tenancy Pattern: Shared Database, Row-Level Isolation**

**Why this approach?**

| Pattern | Pros | Cons | When to Use |
|---------|------|------|-------------|
| **Database per tenant** | Perfect isolation, easy backups | High cost, maintenance overhead | Large enterprises |
| **Schema per tenant** | Good isolation, moderate cost | Schema migrations complex | Mid-size B2B |
| **Row-level isolation** ✅ | Cost-effective, simple | Requires careful query design | SaaS startups |

We chose **row-level isolation** because:
- Lower infrastructure costs
- Simpler to maintain
- We can enforce isolation with proper indexing and middleware
- Can migrate to schema-per-tenant later if needed

**Implementation:**
```typescript
// Every query must be scoped to organization_id
const tasks = await prisma.task.findMany({
  where: {
    project: {
      organization_id: req.user.organizationId // ⚠️ CRITICAL
    }
  }
});
```

#### 2. **Soft Deletes**

**Why?**
- **Data Recovery**: Users accidentally delete things
- **Audit Trail**: Compliance requirements
- **Referenced Data**: Prevent foreign key issues

**Implementation:**
```sql
deleted_at TIMESTAMP -- NULL means active
```

All queries should filter: `WHERE deleted_at IS NULL`

#### 3. **Indexing Strategy**

**Critical indexes:**
- `organization_id`: Every multi-tenant query
- Foreign keys: Default behavior, but verify
- `created_at DESC`: For recent activity queries
- Composite indexes: `(column_id, position)` for sorting within columns

**Query optimization example:**
```sql
-- BAD: Sequential scan
SELECT * FROM tasks WHERE project_id = 'xxx' ORDER BY created_at DESC;

-- GOOD: Index scan
CREATE INDEX idx_tasks_project_created ON tasks(project_id, created_at DESC);
```

#### 4. **JSONB for Flexible Data**

Use JSONB for:
- Settings (org settings, board configs)
- Activity log changes
- Metadata that doesn't need querying

**Don't overuse**: Only use when schema is truly dynamic.

---

## 🔌 API Design

### RESTful API Principles

#### Base URL Structure
```
https://api.yourapp.com/v1
```

#### Resource Hierarchy
```
/organizations/{orgId}
  /projects/{projectId}
    /boards/{boardId}
      /columns/{columnId}
        /tasks/{taskId}
          /comments
          /attachments
```

### Authentication Flow

```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Key Endpoints

#### Organizations
```http
GET    /organizations
POST   /organizations
GET    /organizations/:id
PATCH  /organizations/:id
DELETE /organizations/:id

POST   /organizations/:id/invite
GET    /organizations/:id/members
DELETE /organizations/:id/members/:userId
```

#### Projects
```http
GET    /organizations/:orgId/projects
POST   /organizations/:orgId/projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

#### Tasks (Core API)
```http
GET    /projects/:projectId/tasks
POST   /projects/:projectId/tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id

PATCH  /tasks/:id/move        # Move to different column
POST   /tasks/:id/assign      # Assign to user
POST   /tasks/:id/comments
GET    /tasks/:id/activity
POST   /tasks/:id/attachments
```

### Request/Response Examples

#### Create Task
```http
POST /projects/abc123/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add JWT-based auth system",
  "column_id": "col_123",
  "priority": "high",
  "assigned_to": "user_456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task_789",
    "task_number": 42,
    "project_key": "PROJ",
    "display_id": "PROJ-42",
    "title": "Implement user authentication",
    "status": "todo",
    "priority": "high",
    "created_at": "2026-03-02T10:00:00Z",
    "created_by": {
      "id": "user_123",
      "name": "John Doe",
      "avatar_url": "https://..."
    },
    "assigned_to": {
      "id": "user_456",
      "name": "Jane Smith"
    }
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token",
    "details": null
  }
}
```

**Error Codes:**
- `400` - BAD_REQUEST: Validation errors
- `401` - UNAUTHORIZED: Auth failed
- `403` - FORBIDDEN: Insufficient permissions
- `404` - NOT_FOUND: Resource doesn't exist
- `409` - CONFLICT: Resource already exists
- `429` - RATE_LIMIT_EXCEEDED
- `500` - INTERNAL_SERVER_ERROR

### API Middleware Stack

```typescript
app.use(helmet());                    // Security headers
app.use(cors(corsOptions));           // CORS
app.use(express.json());              // Body parser
app.use(rateLimitMiddleware);         // Rate limiting
app.use(requestLoggerMiddleware);     // Logging
app.use(authMiddleware);              // JWT validation
app.use(organizationScopeMiddleware); // Multi-tenancy
app.use(rbacMiddleware);              // Role-based access
```

---

## 🔐 Security Architecture

### 1. Authentication (AuthN)

**JWT-based authentication:**

```typescript
// Token structure
{
  "sub": "user_123",                    // User ID
  "email": "user@example.com",
  "org_id": "org_456",                  // Current organization
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234571490                     // 1 hour expiry
}
```

**Token types:**
- **Access Token**: Short-lived (1 hour), JWT
- **Refresh Token**: Long-lived (7 days), stored in Redis

**Why this approach?**
- Access tokens are stateless (fast validation)
- Refresh tokens can be revoked (logout, security)
- Balance between security and UX

#### Login Flow
```
1. User submits email + password
2. Verify password (bcrypt)
3. Generate access token + refresh token
4. Store refresh token in Redis: SET refresh:{userId} {token} EX 604800
5. Return both tokens
6. Client stores access token in memory, refresh token in httpOnly cookie
```

#### Token Refresh Flow
```
1. Access token expires
2. Client sends refresh token
3. Verify refresh token exists in Redis
4. Generate new access token
5. Return new access token
```

### 2. Authorization (AuthZ) - RBAC

**Roles per organization:**

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing, delete org |
| **Admin** | Manage projects, members (can't delete org) |
| **Member** | Create/edit tasks, comment |
| **Guest** | View-only access |

**Implementation:**

```typescript
// Middleware
export const requireRole = (...allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// Usage
router.delete(
  '/projects/:id',
  authenticate,
  requireRole('owner', 'admin'),
  deleteProject
);
```

### 3. Multi-Tenancy Security

**Critical: Prevent cross-tenant data leaks**

```typescript
// ❌ WRONG: Direct query
const task = await prisma.task.findUnique({
  where: { id: taskId }
});

// ✅ CORRECT: Scoped query
const task = await prisma.task.findFirst({
  where: {
    id: taskId,
    project: {
      organization_id: req.user.organizationId
    }
  }
});
```

**Middleware approach:**
```typescript
export const organizationScope = async (req, res, next) => {
  // Inject organization filter into all queries
  prisma.$use(async (params, next) => {
    if (params.model === 'Task') {
      params.args.where = {
        ...params.args.where,
        project: {
          organization_id: req.user.organizationId
        }
      };
    }
    return next(params);
  });

  next();
};
```

### 4. Input Validation

**Use Zod for runtime validation:**

```typescript
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().datetime().optional()
});

export const createTask = async (req: Request, res: Response) => {
  const data = createTaskSchema.parse(req.body); // Throws if invalid
  // ... proceed
};
```

### 5. Rate Limiting

**Per-user rate limits:**

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests'
    });
  }
});
```

**Endpoint-specific limits:**
```typescript
// Login: 5 attempts per 15 min
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

// File upload: 10 files per hour
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
```

### 6. Security Headers

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https://s3.amazonaws.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

### 7. SQL Injection Prevention

**Always use parameterized queries:**

```typescript
// ❌ WRONG: String concatenation
const query = `SELECT * FROM tasks WHERE title = '${userInput}'`;

// ✅ CORRECT: Parameterized
const tasks = await prisma.task.findMany({
  where: { title: userInput }
});
```

Prisma automatically sanitizes inputs.

---

## 🏢 Multi-Tenancy Pattern

### Tenant Isolation Strategy

**Every request must:**
1. Identify the user (JWT)
2. Identify the organization (from JWT or URL)
3. Scope all queries to that organization

### Implementation Approaches

#### Approach 1: Middleware Injection (Recommended)

```typescript
export class TenantService {
  private organizationId: string;

  setOrganizationId(orgId: string) {
    this.organizationId = orgId;
  }

  async findTasks(filter: any) {
    return prisma.task.findMany({
      where: {
        ...filter,
        project: {
          organization_id: this.organizationId // Auto-injected
        }
      }
    });
  }
}
```

#### Approach 2: Repository Pattern

```typescript
export class TaskRepository {
  constructor(private organizationId: string) {}

  async findById(taskId: string) {
    return prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          organization_id: this.organizationId
        }
      }
    });
  }
}

// Usage in controller
const repo = new TaskRepository(req.user.organizationId);
const task = await repo.findById(taskId);
```

### Preventing Tenant Leakage

**Unit test every query:**

```typescript
describe('TaskService', () => {
  it('should not allow cross-tenant access', async () => {
    const org1Task = await createTask({ orgId: 'org1' });
    const org2User = { organizationId: 'org2' };

    await expect(
      taskService.findById(org1Task.id, org2User)
    ).rejects.toThrow(NotFoundError);
  });
});
```

---

## ⚡ Caching Strategy

### What to Cache?

| Data Type | TTL | Storage | Reason |
|-----------|-----|---------|--------|
| User session | 1 hour | Redis | Fast auth validation |
| Organization details | 10 min | Redis | Frequently accessed |
| Project metadata | 5 min | Redis | Reduces DB load |
| Board columns | 5 min | Redis | Rarely change |
| Task list (per column) | 1 min | Redis | Balance freshness/performance |
| Activity logs | None | N/A | Must be real-time |

### Cache Patterns

#### 1. Cache-Aside (Lazy Loading)

```typescript
export class ProjectService {
  async getProject(projectId: string): Promise<Project> {
    const cacheKey = `project:${projectId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: fetch from DB
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    // Store in cache
    await redis.setex(cacheKey, 300, JSON.stringify(project));

    return project;
  }
}
```

#### 2. Write-Through

```typescript
export class ProjectService {
  async updateProject(projectId: string, data: any) {
    // Update DB
    const project = await prisma.project.update({
      where: { id: projectId },
      data
    });

    // Update cache immediately
    const cacheKey = `project:${projectId}`;
    await redis.setex(cacheKey, 300, JSON.stringify(project));

    return project;
  }
}
```

#### 3. Cache Invalidation

```typescript
export class TaskService {
  async createTask(data: CreateTaskDto) {
    const task = await prisma.task.create({ data });

    // Invalidate column cache
    await redis.del(`column:${data.column_id}:tasks`);

    // Invalidate project task count
    await redis.del(`project:${data.project_id}:stats`);

    return task;
  }
}
```

### Redis Data Structures

```typescript
// User session: String
await redis.set(`session:${userId}`, JSON.stringify(sessionData), 'EX', 3600);

// Rate limiting: String with TTL
await redis.incr(`rate:${userId}:${endpoint}`);
await redis.expire(`rate:${userId}:${endpoint}`, 900);

// Real-time presence: Set
await redis.sadd(`board:${boardId}:viewers`, userId);
await redis.expire(`board:${boardId}:viewers`, 30);

// Recent activity: List
await redis.lpush(`activity:${projectId}`, JSON.stringify(activity));
await redis.ltrim(`activity:${projectId}`, 0, 99); // Keep last 100
```

---

## 🔄 Real-Time Architecture

### WebSocket Implementation (Socket.io)

#### Server Setup

```typescript
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL }
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.data.user.id}`);

  socket.on('join:board', (boardId) => {
    // Verify access
    if (hasAccessToBoard(socket.data.user, boardId)) {
      socket.join(`board:${boardId}`);

      // Notify others
      socket.to(`board:${boardId}`).emit('user:joined', {
        userId: socket.data.user.id,
        name: socket.data.user.name
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.data.user.id}`);
  });
});
```

#### Events to Broadcast

| Event | When | Payload |
|-------|------|---------|
| `task:created` | New task added | Full task object |
| `task:updated` | Task modified | Changed fields only |
| `task:moved` | Task moved to different column | Task ID + new column |
| `task:deleted` | Task deleted | Task ID |
| `comment:created` | New comment | Comment object |
| `user:joined` | User joins board | User info |
| `user:left` | User leaves board | User ID |
| `user:typing` | User typing comment | User ID + task ID |

#### Client Implementation (React)

```typescript
import { io, Socket } from 'socket.io-client';

export const useSocket = (boardId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const newSocket = io(process.env.REACT_APP_WS_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join:board', boardId);
    });

    newSocket.on('task:updated', (task) => {
      // Update local state
      queryClient.setQueryData(['tasks', task.id], task);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [boardId]);

  return socket;
};
```

### Optimistic Updates

```typescript
const moveTask = useMutation({
  mutationFn: (data) => api.moveTask(data),

  onMutate: async (data) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['tasks']);

    // Snapshot current state
    const previous = queryClient.getQueryData(['tasks']);

    // Optimistically update
    queryClient.setQueryData(['tasks'], (old) => {
      return old.map(task =>
        task.id === data.taskId
          ? { ...task, column_id: data.newColumnId }
          : task
      );
    });

    return { previous };
  },

  onError: (err, data, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks'], context.previous);
  }
});
```

---

## 📁 File Upload Strategy

### S3 Upload Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │────1───>│  Backend │────2───>│   S3     │
│          │<───4────│          │<───3────│          │
└──────────┘         └──────────┘         └──────────┘

1. Request presigned URL
2. Generate presigned URL
3. Return presigned URL
4. Upload directly to S3
5. Confirm upload to backend
```

### Backend Implementation

```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export const getPresignedUrl = async (req: Request, res: Response) => {
  const { fileName, fileType, fileSize } = req.body;

  // Validate
  if (fileSize > 10 * 1024 * 1024) { // 10MB limit
    throw new BadRequestError('File too large');
  }

  const key = `${req.user.organizationId}/${uuidv4()}-${fileName}`;

  const presignedUrl = s3.getSignedUrl('putObject', {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 300, // 5 minutes
    ContentType: fileType,
    ACL: 'private'
  });

  res.json({
    uploadUrl: presignedUrl,
    key,
    expiresIn: 300
  });
};

export const confirmUpload = async (req: Request, res: Response) => {
  const { key, taskId } = req.body;

  // Save attachment record
  const attachment = await prisma.attachment.create({
    data: {
      task_id: taskId,
      uploaded_by: req.user.id,
      file_name: key.split('-').slice(1).join('-'),
      storage_key: key,
      url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`
    }
  });

  res.json(attachment);
};
```

### Frontend Upload

```typescript
const uploadFile = async (file: File, taskId: string) => {
  // 1. Get presigned URL
  const { uploadUrl, key } = await api.getPresignedUrl({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  });

  // 2. Upload directly to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });

  // 3. Confirm upload
  await api.confirmUpload({ key, taskId });
};
```

### Signed URLs for Downloads

```typescript
export const getAttachmentUrl = async (attachmentId: string) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId }
  });

  // Generate signed URL (valid for 1 hour)
  const url = s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET,
    Key: attachment.storage_key,
    Expires: 3600
  });

  return { url };
};
```

---

## ⏰ Background Jobs

### BullMQ Setup

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Define queues
export const emailQueue = new Queue('email', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const activityLogQueue = new Queue('activity-log', { connection });
```

### Job Types

#### 1. Email Notifications

```typescript
// Add job
await emailQueue.add('welcome-email', {
  userId: user.id,
  email: user.email
});

// Worker
const emailWorker = new Worker('email', async (job) => {
  const { userId, email } = job.data;

  if (job.name === 'welcome-email') {
    await sendEmail({
      to: email,
      subject: 'Welcome to ProjectHub',
      template: 'welcome',
      data: { userId }
    });
  }
});
```

#### 2. Activity Logs (Async)

```typescript
// Add job (non-blocking)
await activityLogQueue.add('log-activity', {
  organizationId: req.user.organizationId,
  userId: req.user.id,
  action: 'task.updated',
  entityType: 'task',
  entityId: task.id,
  changes: { status: { from: 'todo', to: 'done' } }
});

// Worker
const activityWorker = new Worker('activity-log', async (job) => {
  await prisma.activityLog.create({
    data: job.data
  });
});
```

#### 3. Scheduled Jobs

```typescript
// Daily summary email (cron)
await emailQueue.add('daily-summary', {}, {
  repeat: {
    pattern: '0 9 * * *' // 9 AM every day
  }
});
```

### Job Configuration

```typescript
const jobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: 100, // Keep last 100
  removeOnFail: 500
};
```

---

## 🧪 Testing Strategy

### Testing Pyramid

```
        ┌───────────────┐
        │   E2E Tests   │  (10%) - Critical user flows
        │   (Cypress)   │
        └───────┬───────┘
            ┌───┴────────────┐
            │ Integration    │  (30%) - API endpoints
            │ Tests          │
            │ (Supertest)    │
            └───┬────────────┘
            ┌───┴──────────────┐
            │  Unit Tests      │  (60%) - Business logic
            │  (Jest)          │
            └──────────────────┘
```

### Unit Tests

```typescript
// task.service.test.ts
describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    service = new TaskService();
  });

  describe('createTask', () => {
    it('should create a task with auto-incremented number', async () => {
      const data = {
        projectId: 'proj_123',
        title: 'Test task',
        columnId: 'col_456'
      };

      const task = await service.createTask(data);

      expect(task.task_number).toBe(1);
      expect(task.title).toBe('Test task');
    });

    it('should throw error for invalid project', async () => {
      await expect(
        service.createTask({ projectId: 'invalid', title: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
```

### Integration Tests

```typescript
// task.api.test.ts
describe('Task API', () => {
  let authToken: string;
  let projectId: string;

  beforeAll(async () => {
    // Setup test DB
    await setupTestDatabase();

    // Create test user and get token
    const user = await createTestUser();
    authToken = generateToken(user);

    // Create test project
    const project = await createTestProject();
    projectId = project.id;
  });

  describe('POST /projects/:id/tasks', () => {
    it('should create a task', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Implement feature X',
          priority: 'high'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('Implement feature X');
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post(`/projects/${projectId}/tasks`)
        .send({ title: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });
});
```

### E2E Tests (Cypress)

```typescript
// cypress/e2e/task-management.cy.ts
describe('Task Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
    cy.visit('/projects/abc123/board');
  });

  it('should create a new task', () => {
    cy.get('[data-testid="add-task-button"]').click();
    cy.get('[data-testid="task-title-input"]').type('New task');
    cy.get('[data-testid="task-submit-button"]').click();

    cy.contains('New task').should('be.visible');
  });

  it('should drag task to different column', () => {
    cy.get('[data-testid="task-card"]').first()
      .drag('[data-testid="column-in-progress"]');

    cy.get('[data-testid="column-in-progress"]')
      .should('contain', 'Task 1');
  });
});
```

---

## 🚀 DevOps & Deployment

### Docker Setup

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .

RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

#### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: projecthub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/projecthub
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your_secret_key
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/main.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t projecthub-backend .

      - name: Push to ECR
        if: github.ref == 'refs/heads/main'
        run: |
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker tag projecthub-backend $ECR_REGISTRY/projecthub:$GITHUB_SHA
          docker push $ECR_REGISTRY/projecthub:$GITHUB_SHA

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster projecthub --service backend --force-new-deployment
```

### AWS Infrastructure

**Services:**
- **EC2/ECS**: Run Docker containers
- **RDS (PostgreSQL)**: Managed database
- **ElastiCache (Redis)**: Managed cache
- **S3**: File storage
- **CloudFront**: CDN for frontend
- **Route 53**: DNS
- **ALB**: Load balancer
- **ACM**: SSL certificates

---

## 📊 Observability

### Logging (Winston)

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'projecthub-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('Task created', {
  taskId: task.id,
  userId: req.user.id,
  organizationId: req.user.organizationId
});
```

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Error middleware
app.use(Sentry.Handlers.errorHandler());
```

### Metrics (Prometheus)

```typescript
import promClient from 'prom-client';

// Metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path, res.statusCode)
      .observe(duration);
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

---

## 📅 Implementation Phases

### Phase 1: Core CRUD (Weeks 1-2)

**Goal**: Basic functionality - users can create orgs, projects, and tasks.

**Tasks:**
1. Setup project structure
   - Initialize monorepo (backend + frontend)
   - Configure TypeScript, ESLint, Prettier
   - Setup Docker Compose for local dev

2. Database setup
   - Design schema (see Database Design section)
   - Setup Prisma
   - Create migrations
   - Seed test data

3. Authentication
   - User registration
   - Login (JWT)
   - Password hashing (bcrypt)
   - Token refresh

4. Organizations
   - Create organization
   - View organization
   - Update organization

5. Projects
   - CRUD operations
   - List projects by organization

6. Tasks
   - CRUD operations
   - List tasks by project
   - Assign tasks to users

7. Frontend basics
   - Setup React + TypeScript
   - Auth pages (login, register)
   - Dashboard layout
   - Project list page
   - Task list page

**Deliverable**: Working CRUD app with authentication.

---

### Phase 2: Permissions & RBAC (Week 3)

**Goal**: Multi-tenancy security and role-based permissions.

**Tasks:**
1. Implement RBAC middleware
   - Define roles (owner, admin, member, guest)
   - Create authorization middleware
   - Apply to all endpoints

2. Organization invitations
   - Generate invite links
   - Accept invitations
   - Revoke invitations

3. Multi-tenancy enforcement
   - Add organization scope middleware
   - Review all queries for tenant isolation
   - Write security tests

4. Frontend permissions
   - Hide/show features based on role
   - Display role in UI

**Deliverable**: Secure multi-tenant system with proper permissions.

---

### Phase 3: Real-Time & Notifications (Week 4)

**Goal**: Collaborative features with real-time updates.

**Tasks:**
1. WebSocket setup
   - Setup Socket.io server
   - Implement authentication
   - Create room-based broadcasting

2. Real-time task updates
   - Broadcast task CRUD events
   - Update UI in real-time
   - Implement optimistic updates

3. Presence tracking
   - Show who's viewing a board
   - Display typing indicators

4. Notifications
   - In-app notification system
   - Mark as read functionality
   - Real-time delivery via WebSocket

5. Frontend real-time
   - Socket.io client integration
   - Real-time task updates
   - Notification UI

**Deliverable**: Real-time collaborative board.

---

### Phase 4: Caching & Optimization (Week 5)

**Goal**: Improve performance with caching and query optimization.

**Tasks:**
1. Redis integration
   - Setup Redis client
   - Implement cache-aside pattern
   - Cache organization/project data

2. Query optimization
   - Add database indexes
   - Optimize N+1 queries
   - Use `select` for specific fields

3. Rate limiting
   - Implement rate limiting middleware
   - Per-user limits
   - Endpoint-specific limits

4. Frontend optimization
   - Implement React Query
   - Add pagination
   - Lazy load components
   - Optimize bundle size

**Deliverable**: Fast, optimized application.

---

### Phase 5: File Uploads & Background Jobs (Week 6)

**Goal**: Support file attachments and async processing.

**Tasks:**
1. S3 setup
   - Configure AWS S3
   - Implement presigned URLs
   - File upload endpoint

2. Attachments
   - Attach files to tasks
   - Download files (signed URLs)
   - Delete files

3. BullMQ setup
   - Configure job queues
   - Implement workers

4. Background jobs
   - Email notifications (async)
   - Activity log processing
   - Scheduled jobs (daily summaries)

5. Frontend file uploads
   - File picker component
   - Upload progress
   - Display attachments

**Deliverable**: Complete file handling and async processing.

---

### Phase 6: Deployment & CI/CD (Week 7)

**Goal**: Production-ready deployment.

**Tasks:**
1. Dockerize applications
   - Backend Dockerfile
   - Frontend Dockerfile
   - Docker Compose for production

2. CI/CD pipeline
   - GitHub Actions workflow
   - Automated testing
   - Build and push to ECR

3. AWS infrastructure
   - Setup RDS (PostgreSQL)
   - Setup ElastiCache (Redis)
   - Configure S3
   - Setup ECS/EC2
   - Configure ALB + SSL

4. Monitoring
   - Setup logging (Winston)
   - Setup error tracking (Sentry)
   - Setup metrics (Prometheus)
   - Create health check endpoint

5. Documentation
   - API documentation
   - Deployment guide
   - Architecture diagrams

**Deliverable**: Deployed production application.

---

### Phase 7: Testing & Refactoring (Week 8)

**Goal**: Comprehensive testing and code quality.

**Tasks:**
1. Unit tests
   - Test services
   - Test repositories
   - Test utilities

2. Integration tests
   - Test API endpoints
   - Test auth flows
   - Test RBAC

3. E2E tests
   - Critical user flows
   - Task management flow
   - Collaboration features

4. Code refactoring
   - Apply SOLID principles
   - Extract reusable components
   - Improve error handling

5. Performance testing
   - Load testing (k6)
   - Identify bottlenecks
   - Optimize slow queries

**Deliverable**: Production-ready, well-tested codebase.

---

## 🎯 Senior-Level Considerations

### Scalability Planning

**Database sharding strategy:**
- Shard by `organization_id` (tenant)
- Use PostgreSQL's logical replication
- Or migrate to Citus (distributed PostgreSQL)

**Horizontal scaling:**
- Stateless backend servers
- Session data in Redis
- Load balancer distributes requests

**Caching strategy:**
- Redis for hot data
- CloudFront CDN for static assets
- Database read replicas

### Security Considerations

- **OWASP Top 10**:防护所有常见漏洞
- **Input validation**: Zod schemas everywhere
- **SQL injection**: Prisma parameterized queries
- **XSS protection**: Sanitize user input
- **CSRF protection**: SameSite cookies
- **Rate limiting**: Prevent abuse
- **Audit logs**: Track all sensitive actions

### Cost Optimization

| Resource | Optimization |
|----------|--------------|
| **Database** | Use connection pooling, optimize queries |
| **Storage** | S3 lifecycle policies, compress images |
| **Compute** | Auto-scaling, use spot instances |
| **Cache** | Reduce cache size, tune TTLs |
| **Bandwidth** | Use CloudFront CDN |

---

## 📚 Learning Outcomes

By completing this project, you will master:

**Frontend:**
- React architecture
- State management (Zustand + React Query)
- Real-time updates
- Optimistic UI
- Performance optimization

**Backend:**
- Clean architecture
- SOLID principles
- Design patterns
- RESTful API design
- Authentication & authorization

**Database:**
- Schema design
- Normalization
- Indexing
- Query optimization
- Transactions

**DevOps:**
- Docker
- CI/CD
- AWS deployment
- Monitoring & logging

**System Design:**
- Multi-tenancy
- Caching strategies
- Real-time architecture
- Background jobs
- Scalability planning

---

## 🚀 Next Steps

1. **Start with Phase 1**: Get core CRUD working
2. **Deploy early**: Get CI/CD working from day 1
3. **Test as you go**: Write tests alongside code
4. **Document decisions**: Keep this file updated
5. **Refactor continuously**: Don't wait until the end

---

## 📞 Interview Talking Points

When discussing this project in interviews:

**Architecture:**
> "I built a multi-tenant SaaS platform using a modular monolith architecture, with row-level tenant isolation for cost efficiency and simplicity. I structured it so modules can be extracted to microservices later if needed."

**Scalability:**
> "I designed the system to scale horizontally by sharding data by organization ID. All sessions are stored in Redis, making backend servers stateless."

**Security:**
> "I implemented JWT-based authentication with refresh tokens, role-based access control, and ensured every database query is scoped to the user's organization to prevent data leaks."

**Performance:**
> "I used Redis for caching frequently accessed data, optimized database queries with proper indexing, and implemented real-time updates with WebSockets to reduce unnecessary API calls."

**Real-Time:**
> "I built a real-time collaborative board using Socket.io, with optimistic UI updates on the frontend to make the experience feel instant even with network latency."

**DevOps:**
> "I containerized the application with Docker, set up CI/CD with GitHub Actions, and deployed to AWS using ECS with auto-scaling and load balancing."

---

## 📖 Conclusion

This project is not just about building features—it's about **thinking like a senior engineer**:

- Making architectural decisions with reasoning
- Considering scalability from the start
- Prioritizing security
- Writing testable, maintainable code
- Deploying production-grade infrastructure

By completing this project, you'll have a portfolio piece that demonstrates mastery of the full stack.

**Good luck! 🚀**
