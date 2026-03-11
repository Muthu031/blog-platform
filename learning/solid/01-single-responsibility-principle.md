# Single Responsibility Principle (SRP)

> "A class should have one, and only one, reason to change." - Robert C. Martin

## 1. Concept Overview

The Single Responsibility Principle states that every module, class, or function should have **one well-defined responsibility** and **one reason to change**. In backend development, this means separating concerns: data access, business logic, validation, presentation, and infrastructure should each live in their own dedicated modules.

As a senior engineer, you understand that SRP isn't about "doing one thing" literally - it's about **cohesion**. A UserService might have multiple methods, but they all serve the same responsibility: managing user business logic. The moment you add email sending or PDF generation to this service, you've violated SRP.

**Key Insight:** Violation of SRP leads to "God objects" - massive classes that do everything, are hard to test, difficult to maintain, and create tight coupling throughout your system.

## 2. Core Principles

### What is a "Responsibility"?

A responsibility is a **reason to change**. Ask yourself:
- "Why would this code need to be modified?"
- "Who are the stakeholders requesting changes?"

Examples:
- **Data Access**: Changes when database schema changes
- **Business Logic**: Changes when business rules change
- **Validation**: Changes when validation rules change
- **Presentation**: Changes when API response format changes
- **Authentication**: Changes when auth mechanisms change

### Signs of SRP Violation

```typescript
// ❌ BAD: UserController doing EVERYTHING
class UserController {
  async createUser(req: Request, res: Response) {
    // 1. Validation (responsibility #1)
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    // 2. Business logic (responsibility #2)
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    // 3. Database access (responsibility #3)
    const user = await db.user.create({
      data: {
        email: req.body.email,
        password: hashedPassword
      }
    });
    
    // 4. Email sending (responsibility #4)
    await sendEmail(user.email, 'Welcome!', 'Thanks for joining');
    
    // 5. Logging (responsibility #5)
    console.log(`User created: ${user.id}`);
    
    // 6. Response formatting (responsibility #6)
    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    });
  }
}

// This class has 6 reasons to change! 
// - Input validation rules change
// - Hash algorithm changes
// - Database schema changes
// - Email provider changes
// - Logging strategy changes
// - API response format changes
```

### Good SRP Design

Each layer has ONE responsibility:

```
Controller: HTTP concerns, request/response
     ↓
Validation: Input validation
     ↓
Service: Business logic orchestration
     ↓
Repository: Data access
     ↓
External Services: Email, logging, etc.
```

## 3. Why This Matters in Real Systems

### Large SaaS Platforms Apply SRP By:

**1. Layer Separation**
- Stripe: Separate payment processing from billing from invoicing
- Shopify: Order service ≠ Inventory service ≠ Shipping service
- Notion: Page service ≠ Permission service ≠ Collaboration service

**2. Microservices**
Each service has one business capability:
- User Service (authentication, user management)
- Project Service (project CRUD)
- Notification Service (sending notifications)

**3. Testability**
When each class has one responsibility, testing is isolated:
- Test business logic without database
- Test validation without HTTP layer
- Mock dependencies easily

**4. Team Scaling**
Different teams own different responsibilities:
- Infrastructure team: Database repositories
- Business team: Service layer logic
- API team: Controllers and routes

## 4. Practical Example in My Multi-Tenant SaaS Project

### Bad Example: God Service

```typescript
// ❌ VIOLATES SRP: TaskService does too much
class TaskService {
  async createTask(data: any, userId: string) {
    // Validation
    if (!data.title || data.title.length > 200) {
      throw new Error('Invalid title');
    }
    
    // Authorization
    const project = await db.project.findUnique({
      where: { id: data.projectId }
    });
    
    if (project.organizationId !== userId) {
      throw new Error('Unauthorized');
    }
    
    // Business logic
    const priority = this.calculatePriority(data);
    
    // Database
    const task = await db.task.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        priority
      }
    });
    
    // Notifications
    await this.sendTaskNotification(task);
    
    // Activity logging
    await this.logActivity(userId, 'task_created', task.id);
    
    // Cache invalidation
    await this.invalidateProjectCache(data.projectId);
    
    // Email
    await this.sendEmailToAssignee(task);
    
    return task;
  }
  
  // Multiple responsibilities mixed together!
}
```

### Good Example: SRP Applied

```typescript
// ✅ FOLLOWS SRP: Each class has ONE responsibility

// 1. VALIDATION - One responsibility: validate input
class TaskValidation {
  static createTaskSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    projectId: z.string().uuid(),
    assigneeId: z.string().uuid().optional(),
    priority: z.number().int().min(1).max(10).optional()
  });
  
  static validate(data: unknown) {
    return this.createTaskSchema.parse(data);
  }
}

// 2. REPOSITORY - One responsibility: data access
class TaskRepository {
  async create(data: CreateTaskDto): Promise<Task> {
    return await db.task.create({ data });
  }
  
  async findById(id: string): Promise<Task | null> {
    return await db.task.findUnique({ where: { id } });
  }
  
  async findByProject(projectId: string): Promise<Task[]> {
    return await db.task.findMany({ where: { projectId } });
  }
  
  async update(id: string, data: Partial<Task>): Promise<Task> {
    return await db.task.update({ where: { id }, data });
  }
}

// 3. AUTHORIZATION - One responsibility: access control
class ProjectAuthorizationService {
  async ensureProjectAccess(
    projectId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const project = await db.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    if (project.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied');
    }
  }
}

// 4. BUSINESS LOGIC - One responsibility: task logic
class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private authService: ProjectAuthorizationService,
    private notificationService: NotificationService,
    private activityLogger: ActivityLogService
  ) {}
  
  async createTask(
    data: CreateTaskDto,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    // Delegate to authorization service
    await this.authService.ensureProjectAccess(
      data.projectId,
      userId,
      organizationId
    );
    
    // Business logic only: calculate priority
    const priority = data.priority ?? this.calculateDefaultPriority(data);
    
    // Delegate to repository
    const task = await this.taskRepo.create({
      ...data,
      priority,
      createdById: userId
    });
    
    // Delegate to notification service
    await this.notificationService.notifyTaskCreated(task);
    
    // Delegate to activity logger
    await this.activityLogger.log({
      userId,
      action: 'task_created',
      resourceId: task.id,
      resourceType: 'task'
    });
    
    return task;
  }
  
  private calculateDefaultPriority(data: CreateTaskDto): number {
    // Pure business logic
    return 5; // Default medium priority
  }
}

// 5. NOTIFICATION - One responsibility: sending notifications
class NotificationService {
  async notifyTaskCreated(task: Task): Promise<void> {
    if (!task.assigneeId) return;
    
    await db.notification.create({
      data: {
        userId: task.assigneeId,
        type: 'task_assigned',
        message: `You've been assigned to: ${task.title}`,
        resourceId: task.id,
        resourceType: 'task'
      }
    });
  }
}

// 6. ACTIVITY LOGGING - One responsibility: audit trail
class ActivityLogService {
  async log(entry: ActivityLogEntry): Promise<void> {
    await db.activityLog.create({ data: entry });
  }
}

// 7. CONTROLLER - One responsibility: HTTP handling
class TaskController {
  constructor(
    private taskService: TaskService,
    private validator: TaskValidation
  ) {}
  
  async createTask(req: Request, res: Response) {
    try {
      // Validate input
      const validData = TaskValidation.validate(req.body);
      
      // Delegate to service
      const task = await this.taskService.createTask(
        validData,
        req.user.id,
        req.user.organizationId
      );
      
      // Format response
      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      // Error handling
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      throw error;
    }
  }
}
```

## 5. Backend Architecture Implementation

### Complete Project Structure Following SRP

```
backend/src/
├── modules/
│   ├── tasks/
│   │   ├── task.controller.ts        # HTTP concerns
│   │   ├── task.service.ts           # Business logic
│   │   ├── task.repository.ts        # Data access
│   │   ├── task.validation.ts        # Input validation
│   │   └── task.types.ts             # Type definitions
│   ├── projects/
│   │   ├── project.controller.ts
│   │   ├── project.service.ts
│   │   ├── project.repository.ts
│   │   └── project.validation.ts
│   └── notifications/
│       ├── notification.service.ts    # Notification logic
│       └── notification.repository.ts
├── shared/
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Authentication
│   │   ├── validation.middleware.ts  # Validation
│   │   └── error.middleware.ts       # Error handling
│   ├── services/
│   │   ├── email.service.ts          # Email sending
│   │   ├── cache.service.ts          # Caching
│   │   └── logger.service.ts         # Logging
│   └── utils/
│       ├── hash.util.ts              # Hashing
│       └── date.util.ts              # Date operations
```

### Implementation

```typescript
// ======= task.types.ts =======
export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  priority?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  assigneeId: string | null;
  priority: number;
  status: TaskStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// ======= task.validation.ts =======
// RESPONSIBILITY: Validate task input
import { z } from 'zod';

export class TaskValidation {
  static createTask = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    projectId: z.string().uuid(),
    assigneeId: z.string().uuid().optional(),
    priority: z.number().int().min(1).max(10).optional()
  });
  
  static updateTask = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    assigneeId: z.string().uuid().optional(),
    priority: z.number().int().min(1).max(10).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional()
  });
}

// ======= task.repository.ts =======
// RESPONSIBILITY: Database operations for tasks
export class TaskRepository {
  async create(data: CreateTaskDto & { createdById: string }): Promise<Task> {
    return await db.task.create({ data });
  }
  
  async findById(id: string): Promise<Task | null> {
    return await db.task.findUnique({ where: { id } });
  }
  
  async findByProject(projectId: string): Promise<Task[]> {
    return await db.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  async update(id: string, data: Partial<Task>): Promise<Task> {
    return await db.task.update({ where: { id }, data });
  }
  
  async delete(id: string): Promise<void> {
    await db.task.delete({ where: { id } });
  }
}

// ======= project-authorization.service.ts =======
// RESPONSIBILITY: Project access control
export class ProjectAuthorizationService {
  async ensureProjectAccess(
    projectId: string,
    organizationId: string
  ): Promise<void> {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true }
    });
    
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    
    if (project.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to this project');
    }
  }
  
  async ensureTaskAccess(
    taskId: string,
    organizationId: string
  ): Promise<Task> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    if (task.project.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to this task');
    }
    
    return task;
  }
}

// ======= task.service.ts =======
// RESPONSIBILITY: Task business logic
export class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectAuth: ProjectAuthorizationService,
    private notificationService: NotificationService,
    private activityLogger: ActivityLogService,
    private cacheService: CacheService
  ) {}
  
  async createTask(
    data: CreateTaskDto,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    // 1. Verify access
    await this.projectAuth.ensureProjectAccess(data.projectId, organizationId);
    
    // 2. Apply business rules
    const taskData = {
      ...data,
      priority: data.priority ?? 5, // Default priority
      createdById: userId
    };
    
    // 3. Create task
    const task = await this.taskRepo.create(taskData);
    
    // 4. Side effects (delegated to other services)
    await Promise.all([
      this.notificationService.notifyTaskCreated(task),
      this.activityLogger.log({
        userId,
        action: 'task_created',
        resourceType: 'task',
        resourceId: task.id,
        organizationId
      }),
      this.cacheService.invalidate(`project:${data.projectId}:tasks`)
    ]);
    
    return task;
  }
  
  async updateTask(
    taskId: string,
    data: Partial<Task>,
    userId: string,
    organizationId: string
  ): Promise<Task> {
    // 1. Verify access
    const task = await this.projectAuth.ensureTaskAccess(taskId, organizationId);
    
    // 2. Update
    const updated = await this.taskRepo.update(taskId, data);
    
    // 3. Side effects
    await Promise.all([
      this.activityLogger.log({
        userId,
        action: 'task_updated',
        resourceType: 'task',
        resourceId: taskId,
        organizationId
      }),
      this.cacheService.invalidate(`project:${task.projectId}:tasks`)
    ]);
    
    return updated;
  }
  
  async getProjectTasks(
    projectId: string,
    organizationId: string
  ): Promise<Task[]> {
    // 1. Verify access
    await this.projectAuth.ensureProjectAccess(projectId, organizationId);
    
    // 2. Check cache
    const cacheKey = `project:${projectId}:tasks`;
    const cached = this.cacheService.get<Task[]>(cacheKey);
    
    if (cached) return cached;
    
    // 3. Fetch from database
    const tasks = await this.taskRepo.findByProject(projectId);
    
    // 4. Cache result
    this.cacheService.set(cacheKey, tasks, 300);
    
    return tasks;
  }
}

// ======= notification.service.ts =======
// RESPONSIBILITY: Sending notifications
export class NotificationService {
  async notifyTaskCreated(task: Task): Promise<void> {
    if (!task.assigneeId) return;
    
    await db.notification.create({
      data: {
        userId: task.assigneeId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You've been assigned to: ${task.title}`,
        resourceType: 'task',
        resourceId: task.id
      }
    });
  }
  
  async notifyTaskCompleted(task: Task): Promise<void> {
    await db.notification.create({
      data: {
        userId: task.createdById,
        type: 'task_completed',
        title: 'Task Completed',
        message: `Task "${task.title}" has been completed`,
        resourceType: 'task',
        resourceId: task.id
      }
    });
  }
}

// ======= activity-log.service.ts =======
// RESPONSIBILITY: Recording activity logs
export interface ActivityLogEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId: string;
  metadata?: Record<string, any>;
}

export class ActivityLogService {
  async log(entry: ActivityLogEntry): Promise<void> {
    await db.activityLog.create({
      data: {
        ...entry,
        createdAt: new Date()
      }
    });
  }
  
  async getRecentActivity(
    organizationId: string,
    limit: number = 50
  ): Promise<ActivityLog[]> {
    return await db.activityLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

// ======= task.controller.ts =======
// RESPONSIBILITY: HTTP request/response handling
export class TaskController {
  constructor(private taskService: TaskService) {}
  
  async createTask(req: Request, res: Response) {
    try {
      // Validate
      const validData = TaskValidation.createTask.parse(req.body);
      
      // Execute
      const task = await this.taskService.createTask(
        validData,
        req.user.id,
        req.user.organizationId
      );
      
      // Respond
      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      throw error;
    }
  }
  
  async getProjectTasks(req: Request, res: Response) {
    const { projectId } = req.params;
    
    const tasks = await this.taskService.getProjectTasks(
      projectId,
      req.user.organizationId
    );
    
    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  }
  
  async updateTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const validData = TaskValidation.updateTask.parse(req.body);
      
      const task = await this.taskService.updateTask(
        taskId,
        validData,
        req.user.id,
        req.user.organizationId
      );
      
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      throw error;
    }
  }
}
```

## 6. Production-Quality Code Example

See Section 5 above for complete production example.

## 7. Database Perspective

SRP applies to database design too:

### Good: Separate Tables with Single Responsibilities

```sql
-- users table: User identity only
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_profiles table: User profile data
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  bio TEXT
);

-- user_preferences table: User settings
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  theme VARCHAR(20),
  language VARCHAR(10),
  notifications_enabled BOOLEAN DEFAULT true
);

-- Each table has ONE reason to change
```

### Bad: God Table

```sql
-- ❌ users table doing everything
CREATE TABLE users (
  -- Identity
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  
  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  bio TEXT,
  
  -- Preferences
  theme VARCHAR(20),
  language VARCHAR(10),
  notifications_enabled BOOLEAN,
  
  -- Subscription
  subscription_tier VARCHAR(50),
  subscription_expires_at TIMESTAMP,
  
  -- Billing
  stripe_customer_id VARCHAR(100),
  payment_method VARCHAR(50),
  
  -- Too many responsibilities!
);
```

## 8. Common Developer Mistakes

### ❌ Mistake 1: "Helper" Classes That Do Everything

```typescript
// BAD: Utility hell
class Utils {
  static hashPassword(password: string) { }
  static sendEmail(to: string, subject: string) { }
  static logActivity(action: string) { }
  static formatDate(date: Date) { }
  static validateInput(data: any) { }
  // 100 more unrelated methods...
}

// GOOD: Specific responsibilities
class HashService {
  static hash(password: string) { }
  static verify(password: string, hash: string) { }
}

class EmailService {
  async send(to: string, subject: string, body: string) { }
}

class ActivityLogger {
  async log(entry: ActivityLogEntry) { }
}
```

### ❌ Mistake 2: Service Doing Data Access

```typescript
// BAD: Service talking directly to database
class TaskService {
  async createTask(data: CreateTaskDto) {
    const task = await db.task.create({ data });  // ❌ Direct DB access
    return task;
  }
}

// GOOD: Repository handles data access
class TaskService {
  constructor(private taskRepo: TaskRepository) {}
  
  async createTask(data: CreateTaskDto) {
    const task = await this.taskRepo.create(data);  // ✅ Through repository
    return task;
  }
}
```

### ❌ Mistake 3: Controller Containing Business Logic

```typescript
// BAD: Business logic in controller
class TaskController {
  async createTask(req: Request, res: Response) {
    const data = req.body;
    
    // ❌ Business logic in controller
    const priority = data.urgent ? 10 : 5;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const task = await db.task.create({
      data: { ...data, priority, dueDate }
    });
    
    res.json(task);
  }
}

// GOOD: Business logic in service
class TaskService {
  calculatePriority(data: CreateTaskDto): number {
    return data.urgent ? 10 : 5;
  }
  
  calculateDueDate(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}
```

## 9. Senior Engineer Thinking

### How to Identify Responsibilities

Ask these questions:

1. **"Why would this class change?"**
   - If you have multiple answers, split it

2. **"Can I describe this class in one sentence without using 'and'?"**
   - "TaskService handles task business logic" ✅
   - "TaskService handles tasks and sends emails and logs activity" ❌

3. **"Who are the stakeholders?"**
   - Different stakeholders = different responsibilities
   - Business team wants features → Service layer
   - DBA wants schema changes → Repository layer
   - API consumers want format changes → Controller layer

### Refactoring Strategy

```typescript
// Step 1: Identify responsibilities in existing code
class TaskManager {  // Too many responsibilities!
  // Responsibility 1: Data access
  async save(task: Task) { }
  
  // Responsibility 2: Business logic
  calculatePriority() { }
  
  // Responsibility 3: Notification
  notifyAssignee() { }
  
  // Responsibility 4: Logging
  logActivity() { }
}

// Step 2: Extract each responsibility
class TaskRepository {
  async save(task: Task) { }
}

class TaskService {
  calculatePriority() { }
}

class NotificationService {
  notifyAssignee() { }
}

class ActivityLogger {
  logActivity() { }
}
```

## 10. Performance and Scalability Impact

### Benefits of SRP on Performance

**1. Caching Precision**
```typescript
// SRP allows granular caching
class TaskRepository {
  async findById(id: string): Promise<Task> {
    return cache.getOrFetch(`task:${id}`, () => db.task.findUnique({ where: { id } }));
  }
}

// Not possible with God service mixing concerns
```

**2. Parallel Execution**
```typescript
// SRP enables parallel operations
await Promise.all([
  notificationService.notify(task),  // Can run in parallel
  activityLogger.log(task),          // Independent
  cacheService.invalidate(task)      // No dependencies
]);
```

**3. Independent Scaling**
```typescript
// Microservices: Scale services independently
// High notification load? Scale notification service
// Heavy database queries? Scale repository service
```

## 11. Interview Perspective

### Common Interview Questions

**Q1: "Explain SRP with an example"**

**Answer:**
"SRP states a class should have one reason to change. For example, a UserService should handle user business logic only. If it also sends emails, it has two reasons to change: when business rules change, or when email providers change. I'd extract email sending to an EmailService, giving each class a single responsibility."

**Q2: "How do you identify SRP violations?"**

**Answer:**
"I look for classes that have multiple reasons to change. For instance, if a class handles HTTP requests, validates input, and accesses the database, that's three responsibilities. I'd refactor into Controller (HTTP), Validator (validation), and Repository (data access)."

**Q3: "Doesn't SRP create too many classes?"**

**Answer:**
"More classes isn't bad if each is focused and maintainable. In production systems, I prefer 10 small, clear classes over 1 large, complex class. Small classes are easier to test, reuse, and modify independently. The key is meaningful separation, not arbitrary splitting."

## 12. Practical Exercise

### Task: Refactor UserService to Follow SRP

**Given: God Service (Violates SRP)**

```typescript
class UserService {
  async registerUser(data: RegisterDto) {
    // 1. Validation
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Invalid email');
    }
    
    // 2. Hashing
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // 3. Database
    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword
      }
    });
    
    // 4. Email
    await this.sendWelcomeEmail(user.email);
    
    // 5. Logging
    console.log(`User registered: ${user.id}`);
    
    // 6. Cache
    await this.cacheUser(user);
    
    return user;
  }
  
  private isValidEmail(email: string): boolean { }
  private sendWelcomeEmail(email: string): Promise<void> { }
  private cacheUser(user: User): Promise<void> { }
}
```

**Your Task:**
1. Identify all responsibilities in this class
2. Create separate classes/services for each responsibility
3. Refactor UserService to orchestrate these services
4. Add proper dependency injection
5. Write unit tests for each isolated responsibility

**Success Criteria:**
- ✅ Each class has ONE reason to change
- ✅ Services are easily testable in isolation
- ✅ Dependencies are injected, not created
- ✅ Code is more maintainable
- ✅ Each responsibility can be modified independently

**Solution Structure:**

```typescript
// 1. Validation responsibility
class UserValidation { }

// 2. Hashing responsibility
class HashService { }

// 3. Data access responsibility
class UserRepository { }

// 4. Email responsibility
class EmailService { }

// 5. Logging responsibility
class Logger { }

// 6. Cache responsibility
class CacheService { }

// Orchestrator (business logic only)
class UserService {
  constructor(
    private userRepo: UserRepository,
    private hashService: HashService,
    private emailService: EmailService,
    private logger: Logger,
    private cache: CacheService
  ) {}
  
  async registerUser(data: RegisterDto) {
    // Orchestrate the responsibilities
  }
}
```

## 13. Advanced Learning Extension

### Advanced SRP Patterns

**1. Command Pattern for Single Responsibility**

```typescript
// Each command has ONE responsibility
interface Command {
  execute(): Promise<void>;
}

class CreateTaskCommand implements Command {
  constructor(
    private taskRepo: TaskRepository,
    private data: CreateTaskDto
  ) {}
  
  async execute(): Promise<void> {
    await this.taskRepo.create(this.data);
  }
}

class SendNotificationCommand implements Command {
  constructor(
    private notificationService: NotificationService,
    private task: Task
  ) {}
  
  async execute(): Promise<void> {
    await this.notificationService.notify(this.task);
  }
}

// Orchestrator
class TaskCreationOrchestrator {
  async createTask(data: CreateTaskDto) {
    const commands: Command[] = [
      new CreateTaskCommand(taskRepo, data),
      new SendNotificationCommand(notificationService, task),
      new LogActivityCommand(logger, activity)
    ];
    
    for (const command of commands) {
      await command.execute();
    }
  }
}
```

**2. Event-Driven SRP**

```typescript
// Service emits events, doesn't handle side effects
class TaskService extends EventEmitter {
  async createTask(data: CreateTaskDto): Promise<Task> {
    const task = await this.taskRepo.create(data);
    
    // Emit event instead of calling services directly
    this.emit('task.created', task);
    
    return task;
  }
}

// Separate handlers for each responsibility
taskService.on('task.created', async (task) => {
  await notificationService.notify(task);
});

taskService.on('task.created', async (task) => {
  await activityLogger.log(task);
});

taskService.on('task.created', async (task) => {
  await cacheService.invalidate(`project:${task.projectId}`);
});
```

---

## Next Lesson

Continue to [Open/Closed Principle](02-open-closed-principle.md)

---

**Remember:** A class should have one, and only one, reason to change. Separate concerns for maintainable, scalable code!
