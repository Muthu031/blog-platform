# Lesson 2: Database Setup with Prisma

## 🎯 Goal
Set up PostgreSQL database with Prisma ORM and design the core schema for multi-tenancy.

## 📚 What You'll Learn
- Prisma ORM setup and configuration
- Database schema design principles
- Multi-tenant data modeling
- Database migrations
- Seeding data for development

## 📋 Prerequisites
- Completed Lesson 1
- Docker containers running (postgres & redis)
- Basic SQL knowledge

## 🛠️ Tasks

### 1. Install Prisma

```bash
cd backend
npm install prisma --save-dev
npm install @prisma/client

# Initialize Prisma
npx prisma init
```

This creates:
- `prisma/` directory
- `prisma/schema.prisma` file
- Updates `.env` with DATABASE_URL

### 2. Configure Prisma Schema

Update `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USERS (Global, not per tenant)
// ============================================
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  name          String
  avatarUrl     String?  @map("avatar_url")
  emailVerified Boolean  @default(false) @map("email_verified")
  lastLoginAt   DateTime? @map("last_login_at")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Relationships
  organizationMembers OrganizationMember[]
  createdTasks        Task[]               @relation("TaskCreator")
  assignedTasks       Task[]               @relation("TaskAssignee")
  comments            Comment[]
  attachments         Attachment[]
  activityLogs        ActivityLog[]
  invitationsSent     Invitation[]

  @@index([email])
  @@index([deletedAt])
  @@map("users")
}

// ============================================
// ORGANIZATIONS (Tenant Boundary)
// ============================================
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  avatarUrl String?  @map("avatar_url")
  plan      String   @default("free") // free, pro, enterprise
  settings  Json     @default("{}")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Relationships
  members      OrganizationMember[]
  projects     Project[]
  invitations  Invitation[]
  activityLogs ActivityLog[]

  @@index([slug])
  @@index([deletedAt])
  @@map("organizations")
}

// ============================================
// ORGANIZATION MEMBERS (Tenant + User Join)
// ============================================
model OrganizationMember {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  userId         String   @map("user_id")
  role           String   // owner, admin, member, guest
  joinedAt       DateTime @default(now()) @map("joined_at")
  invitedBy      String?  @map("invited_by")

  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
  @@map("organization_members")
}

// ============================================
// PROJECTS
// ============================================
model Project {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  name           String
  key            String   // e.g., "PROJ" for task keys like PROJ-123
  description    String?
  color          String?  // hex color
  icon           String?
  visibility     String   @default("private") // private, organization, public
  archived       Boolean  @default(false)
  createdBy      String?  @map("created_by")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  // Relationships
  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  boards       Board[]
  tasks        Task[]
  labels       Label[]
  activityLogs ActivityLog[]

  @@unique([organizationId, key])
  @@index([organizationId])
  @@index([archived])
  @@map("projects")
}

// ============================================
// BOARDS (Multiple views per project)
// ============================================
model Board {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String
  type      String   @default("kanban") // kanban, list, timeline, calendar
  settings  Json     @default("{}")
  position  Int?

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relationships
  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  columns Column[]

  @@index([projectId])
  @@map("boards")
}

// ============================================
// COLUMNS (Board columns)
// ============================================
model Column {
  id       String  @id @default(uuid())
  boardId  String  @map("board_id")
  name     String
  position Int
  color    String?
  wipLimit Int?    @map("wip_limit") // work in progress limit

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relationships
  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks Task[]

  @@index([boardId])
  @@index([boardId, position])
  @@map("columns")
}

// ============================================
// TASKS (Core entity)
// ============================================
model Task {
  id            String    @id @default(uuid())
  projectId     String    @map("project_id")
  columnId      String?   @map("column_id")
  taskNumber    Int       @map("task_number") // Auto-increment per project
  title         String
  description   String?
  status        String    @default("todo")
  priority      String    @default("medium") // low, medium, high, urgent
  type          String    @default("task") // task, bug, story, epic
  position      Int

  // Relationships
  createdBy    String    @map("created_by")
  assignedTo   String?   @map("assigned_to")
  parentTaskId String?   @map("parent_task_id")

  // Metadata
  estimatedHours Decimal?   @map("estimated_hours") @db.Decimal(10, 2)
  actualHours    Decimal?   @map("actual_hours") @db.Decimal(10, 2)
  dueDate        DateTime?  @map("due_date") @db.Date
  startedAt      DateTime?  @map("started_at")
  completedAt    DateTime?  @map("completed_at")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Relationships
  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  column       Column?       @relation(fields: [columnId], references: [id], onDelete: SetNull)
  creator      User          @relation("TaskCreator", fields: [createdBy], references: [id])
  assignee     User?         @relation("TaskAssignee", fields: [assignedTo], references: [id])
  parentTask   Task?         @relation("Subtasks", fields: [parentTaskId], references: [id])
  subtasks     Task[]        @relation("Subtasks")
  comments     Comment[]
  attachments  Attachment[]
  activityLogs ActivityLog[]
  taskLabels   TaskLabel[]

  @@unique([projectId, taskNumber])
  @@index([projectId])
  @@index([columnId])
  @@index([assignedTo])
  @@index([createdBy])
  @@index([parentTaskId])
  @@index([columnId, position])
  @@index([dueDate])
  @@map("tasks")
}

// ============================================
// LABELS
// ============================================
model Label {
  id        String @id @default(uuid())
  projectId String @map("project_id")
  name      String
  color     String

  // Relationships
  project    Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  taskLabels TaskLabel[]

  @@unique([projectId, name])
  @@map("labels")
}

model TaskLabel {
  taskId  String @map("task_id")
  labelId String @map("label_id")

  // Relationships
  task  Task  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([taskId, labelId])
  @@map("task_labels")
}

// ============================================
// COMMENTS
// ============================================
model Comment {
  id              String    @id @default(uuid())
  taskId          String    @map("task_id")
  userId          String    @map("user_id")
  content         String
  parentCommentId String?   @map("parent_comment_id")

  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // Relationships
  task          Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user          User         @relation(fields: [userId], references: [id])
  parentComment Comment?     @relation("CommentReplies", fields: [parentCommentId], references: [id])
  replies       Comment[]    @relation("CommentReplies")
  attachments   Attachment[]

  @@index([taskId])
  @@index([userId])
  @@map("comments")
}

// ============================================
// ATTACHMENTS
// ============================================
model Attachment {
  id         String  @id @default(uuid())
  taskId     String? @map("task_id")
  commentId  String? @map("comment_id")
  uploadedBy String  @map("uploaded_by")
  fileName   String  @map("file_name")
  fileSize   BigInt  @map("file_size")
  mimeType   String? @map("mime_type")
  storageKey String  @map("storage_key")
  url        String

  createdAt DateTime @default(now()) @map("created_at")

  // Relationships
  task    Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  comment Comment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user    User     @relation(fields: [uploadedBy], references: [id])

  @@index([taskId])
  @@index([commentId])
  @@map("attachments")
}

// ============================================
// ACTIVITY LOGS (Audit trail)
// ============================================
model ActivityLog {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  projectId      String?  @map("project_id")
  taskId         String?  @map("task_id")
  userId         String?  @map("user_id")
  action         String   // created, updated, deleted, moved, commented
  entityType     String   @map("entity_type") // task, project, comment
  entityId       String   @map("entity_id")
  changes        Json?
  metadata       Json?

  createdAt DateTime @default(now()) @map("created_at")

  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  project      Project?     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task         Task?        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user         User?        @relation(fields: [userId], references: [id])

  @@index([organizationId, createdAt(sort: Desc)])
  @@index([projectId, createdAt(sort: Desc)])
  @@index([taskId, createdAt(sort: Desc)])
  @@index([userId])
  @@map("activity_logs")
}

// ============================================
// INVITATIONS
// ============================================
model Invitation {
  id             String    @id @default(uuid())
  organizationId String    @map("organization_id")
  email          String
  role           String
  token          String    @unique
  invitedBy      String    @map("invited_by")
  expiresAt      DateTime  @map("expires_at")
  acceptedAt     DateTime? @map("accepted_at")

  createdAt DateTime @default(now()) @map("created_at")

  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inviter      User         @relation(fields: [invitedBy], references: [id])

  @@index([token])
  @@index([email])
  @@map("invitations")
}
```

### 3. Create Database Migration

```bash
# Generate migration
npx prisma migrate dev --name init

# This will:
# 1. Create migration files
# 2. Apply migration to database
# 3. Generate Prisma Client
```

### 4. Create Prisma Client Instance

Create `backend/src/config/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
```

### 5. Create Seed Script

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      emailVerified: true,
    },
  });

  console.log('✅ Created user:', user.email);

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Inc',
      slug: 'acme',
      plan: 'pro',
    },
  });

  console.log('✅ Created organization:', org.name);

  // Add user to organization as owner
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });

  console.log('✅ Added user to organization');

  // Create project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Sample Project',
      key: 'SAMPLE',
      description: 'A sample project for development',
      createdBy: user.id,
    },
  });

  console.log('✅ Created project:', project.name);

  // Create board
  const board = await prisma.board.create({
    data: {
      projectId: project.id,
      name: 'Main Board',
      type: 'kanban',
    },
  });

  console.log('✅ Created board:', board.name);

  // Create columns
  const columns = await Promise.all([
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'To Do',
        position: 0,
        color: '#94a3b8',
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'In Progress',
        position: 1,
        color: '#3b82f6',
      },
    }),
    prisma.column.create({
      data: {
        boardId: board.id,
        name: 'Done',
        position: 2,
        color: '#22c55e',
      },
    }),
  ]);

  console.log('✅ Created columns:', columns.length);

  // Create sample tasks
  const todoColumn = columns[0];

  await prisma.task.create({
    data: {
      projectId: project.id,
      columnId: todoColumn.id,
      taskNumber: 1,
      title: 'Set up authentication system',
      description: 'Implement JWT-based authentication',
      priority: 'high',
      type: 'task',
      position: 0,
      createdBy: user.id,
      assignedTo: user.id,
    },
  });

  console.log('✅ Created sample task');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Install bcrypt:
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

Update `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run seed:
```bash
npx prisma db seed
```

### 6. Create Database Helper Functions

Create `backend/src/shared/utils/database.ts`:

```typescript
import prisma from '@/config/database';

/**
 * Get next task number for a project
 */
export async function getNextTaskNumber(projectId: string): Promise<number> {
  const lastTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { taskNumber: 'desc' },
    select: { taskNumber: true },
  });

  return (lastTask?.taskNumber || 0) + 1;
}

/**
 * Soft delete helper
 */
export async function softDelete<T extends { deletedAt?: Date | null }>(
  model: any,
  id: string
): Promise<T> {
  return model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Check if user has access to organization
 */
export async function hasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  return !!member;
}
```

## ✅ Verification

Test database connection:

```typescript
// Create backend/src/test-db.ts
import prisma from './config/database';

async function testConnection() {
  try {
    const userCount = await prisma.user.count();
    console.log('✅ Database connection successful!');
    console.log(`Users in database: ${userCount}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

Run test:
```bash
npx ts-node src/test-db.ts
```

View database in Prisma Studio:
```bash
npx prisma studio
```

## 🎓 Key Concepts

### Multi-Tenant Data Model
- **Organization as Tenant**: All data is scoped to an organization
- **Row-Level Isolation**: Queries must always include organizationId
- **Soft Deletes**: Use deletedAt instead of hard deletes

### Database Indexing
- Index foreign keys for JOIN performance
- Index fields used in WHERE clauses
- Composite indexes for multi-column queries

### Prisma Benefits
- Type-safe database access
- Auto-generated TypeScript types
- Migration management
- Easy to test and mock

## 📝 Commit Your Progress

```bash
git add .
git commit -m "feat: set up Prisma with multi-tenant schema"
```

## 🔜 Next Lesson

**Lesson 3**: Authentication System
- JWT token generation
- Password hashing
- Login/Register endpoints
- Auth middleware

## 💡 Additional Challenges

1. Add database connection pooling
2. Create a migration rollback script
3. Add database query logging in development
4. Create database backup script

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Database Indexing Strategies](https://use-the-index-luke.com/)
