# Interface Segregation Principle (ISP)

> "No client should be forced to depend on methods it does not use."

## 1. Concept Overview

ISP states that it's better to have many small, specific interfaces than one large, general-purpose interface. Clients should only need to know about the methods that are relevant to them.

**Key Rule:** Don't force classes to implement methods they don't need. Split large interfaces into smaller, focused ones.

## 2. Core Principles

### Violates ISP (Fat Interface)

```typescript
// ❌ FAT INTERFACE - Forces implementations to implement everything
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  getPaid(): void;
}

class HumanWorker implements Worker {
  work(): void { console.log('Working...'); }
  eat(): void { console.log('Eating...'); }
  sleep(): void { console.log('Sleeping...'); }
  getPaid(): void { console.log('Getting paid...'); }
}

class RobotWorker implements Worker {
  work(): void { console.log('Working...'); }
  
  eat(): void {
    throw new Error('Robots don\'t eat!'); // Forced to implement!
  }
  
  sleep(): void {
    throw new Error('Robots don\'t sleep!'); // Forced to implement!
  }
  
  getPaid(): void {
    throw new Error('Robots don\'t get paid!'); // Forced to implement!
  }
}
```

### Follows ISP (Segregated Interfaces)

```typescript
// ✅ SEGREGATED INTERFACES
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

interface Payable {
  getPaid(): void;
}

class HumanWorker implements Workable, Eatable, Sleepable, Payable {
  work(): void { console.log('Working...'); }
  eat(): void { console.log('Eating...'); }
  sleep(): void { console.log('Sleeping...'); }
  getPaid(): void { console.log('Getting paid...'); }
}

class RobotWorker implements Workable {
  work(): void { console.log('Working...'); }
  // Only implements what it needs!
}

// Usage
function makeWork(worker: Workable) {
  worker.work(); // Works for both humans and robots
}

function payWorker(worker: Payable) {
  worker.getPaid(); // Only for payable workers
}
```

## 3. Real-World Examples

### Example 1: Task Repository (Fat vs. Segregated)

```typescript
// ❌ FAT INTERFACE
interface TaskRepository {
  // Read operations
  findById(id: string): Promise<Task | null>;
  findMany(filter: any): Promise<Task[]>;
  count(filter: any): Promise<number>;
  
  // Write operations
  create(data: Partial<Task>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  
  // Bulk operations
  bulkCreate(data: Partial<Task>[]): Promise<Task[]>;
  bulkUpdate(updates: Array<{ id: string; data: Partial<Task> }>): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  
  // Advanced operations
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  duplicate(id: string): Promise<Task>;
}

// Implementation forced to implement everything
class SimpleTaskRepository implements TaskRepository {
  // ... must implement all 12 methods even if only needs basic CRUD
}

// ✅ SEGREGATED INTERFACES
interface TaskReader {
  findById(id: string): Promise<Task | null>;
  findMany(filter: any): Promise<Task[]>;
  count(filter: any): Promise<number>;
}

interface TaskWriter {
  create(data: Partial<Task>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
}

interface BulkTaskOperations {
  bulkCreate(data: Partial<Task>[]): Promise<Task[]>;
  bulkUpdate(updates: Array<{ id: string; data: Partial<Task> }>): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
}

interface AdvancedTaskOperations {
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  duplicate(id: string): Promise<Task>;
}

// Implementations only implement what they need
class BasicTaskRepository implements TaskReader, TaskWriter {
  async findById(id: string): Promise<Task | null> {
    return await db.task.findUnique({ where: { id } });
  }
  
  async findMany(filter: any): Promise<Task[]> {
    return await db.task.findMany(filter);
  }
  
  async count(filter: any): Promise<number> {
    return await db.task.count(filter);
  }
  
  async create(data: Partial<Task>): Promise<Task> {
    return await db.task.create({ data });
  }
  
  async update(id: string, data: Partial<Task>): Promise<Task> {
    return await db.task.update({ where: { id }, data });
  }
  
  async delete(id: string): Promise<void> {
    await db.task.delete({ where: { id } });
  }
}

class FullTaskRepository implements TaskReader, TaskWriter, BulkTaskOperations, AdvancedTaskOperations {
  // Implements all interfaces
}

// Services depend only on what they need
class TaskQueryService {
  constructor(private repo: TaskReader) {} // Only needs reading!
  
  async getTask(id: string): Promise<Task | null> {
    return await this.repo.findById(id);
  }
}

class TaskCreationService {
  constructor(private repo: TaskWriter) {} // Only needs writing!
  
  async createTask(data: Partial<Task>): Promise<Task> {
    return await this.repo.create(data);
  }
}

class BulkTaskService {
  constructor(private repo: BulkTaskOperations) {} // Only needs bulk ops!
  
  async createMany(tasks: Partial<Task>[]): Promise<Task[]> {
    return await this.repo.bulkCreate(tasks);
  }
}
```

### Example 2: Notification Service

```typescript
// ❌ FAT INTERFACE
interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
  sendPush(deviceToken: string, title: string, body: string): Promise<void>;
  sendSlack(channel: string, message: string): Promise<void>;
  scheduleEmail(to: string, subject: string, body: string, sendAt: Date): Promise<void>;
  scheduleSMS(to: string, message: string, sendAt: Date): Promise<void>;
  getHistory(userId: string): Promise<Notification[]>;
  getStats(): Promise<NotificationStats>;
}

// ✅ SEGREGATED INTERFACES
interface EmailSender {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface SMSSender {
  sendSMS(to: string, message: string): Promise<void>;
}

interface PushSender {
  sendPush(deviceToken: string, title: string, body: string): Promise<void>;
}

interface ScheduledNotifications {
  scheduleEmail(to: string, subject: string, body: string, sendAt: Date): Promise<void>;
  scheduleSMS(to: string, message: string, sendAt: Date): Promise<void>;
}

interface NotificationHistory {
  getHistory(userId: string): Promise<Notification[]>;
  getStats(): Promise<NotificationStats>;
}

// Implementations
class EmailService implements EmailSender {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Email implementation
  }
}

class SMSService implements SMSSender {
  async sendSMS(to: string, message: string): Promise<void> {
    // SMS implementation
  }
}

// Services depend only on what they need
class UserRegistrationService {
  constructor(private emailSender: EmailSender) {} // Only needs email!
  
  async registerUser(email: string): Promise<void> {
    await this.emailSender.sendEmail(
      email,
      'Welcome!',
      'Thanks for joining'
    );
  }
}

class TwoFactorAuthService {
  constructor(private smsSender: SMSSender) {} // Only needs SMS!
  
  async sendCode(phone: string, code: string): Promise<void> {
    await this.smsSender.sendSMS(phone, `Your code: ${code}`);
  }
}
```

### Example 3: User Operations

```typescript
// ❌ FAT INTERFACE
interface UserService {
  // Authentication
  login(email: string, password: string): Promise<string>;
  logout(token: string): Promise<void>;
  refreshToken(token: string): Promise<string>;
  
  // Profile
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
  uploadAvatar(userId: string, file: Buffer): Promise<string>;
  
  // Permissions
  hasPermission(userId: string, permission: string): Promise<boolean>;
  grantPermission(userId: string, permission: string): Promise<void>;
  revokePermission(userId: string, permission: string): Promise<void>;
  
  // Admin
  deleteUser(userId: string): Promise<void>;
  suspendUser(userId: string): Promise<void>;
  reactivateUser(userId: string): Promise<void>;
  
  // Analytics
  getUserStats(userId: string): Promise<UserStats>;
  getActivityLog(userId: string): Promise<Activity[]>;
}

// ✅ SEGREGATED INTERFACES
interface AuthenticationService {
  login(email: string, password: string): Promise<string>;
  logout(token: string): Promise<void>;
  refreshToken(token: string): Promise<string>;
}

interface ProfileService {
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
  uploadAvatar(userId: string, file: Buffer): Promise<string>;
}

interface PermissionService {
  hasPermission(userId: string, permission: string): Promise<boolean>;
  grantPermission(userId: string, permission: string): Promise<void>;
  revokePermission(userId: string, permission: string): Promise<void>;
}

interface UserAdminService {
  deleteUser(userId: string): Promise<void>;
  suspendUser(userId: string): Promise<void>;
  reactivateUser(userId: string): Promise<void>;
}

interface UserAnalyticsService {
  getUserStats(userId: string): Promise<UserStats>;
  getActivityLog(userId: string): Promise<Activity[]>;
}

// Controllers depend only on what they need
class AuthController {
  constructor(private auth: AuthenticationService) {}
  
  async login(req: Request, res: Response) {
    const token = await this.auth.login(req.body.email, req.body.password);
    res.json({ token });
  }
}

class ProfileController {
  constructor(private profile: ProfileService) {}
  
  async getProfile(req: Request, res: Response) {
    const user = await this.profile.getProfile(req.user.id);
    res.json({ data: user });
  }
}

class AdminController {
  constructor(
    private userAdmin: UserAdminService,
    private analytics: UserAnalyticsService
  ) {}
  
  async deleteUser(req: Request, res: Response) {
    await this.userAdmin.deleteUser(req.params.userId);
    res.json({ success: true });
  }
  
  async getStats(req: Request, res: Response) {
    const stats = await this.analytics.getUserStats(req.params.userId);
    res.json({ data: stats });
  }
}
```

## 4. Benefits of ISP

### 1. Easier Testing
```typescript
// Easy to mock only what you need
class MockEmailSender implements EmailSender {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Mock implementation - only one method!
  }
}

// Don't need to mock entire notification system
```

### 2. Flexible Implementations
```typescript
// Can implement only needed interfaces
class ReadOnlyTaskRepository implements TaskReader {
  // Only read methods
}

class FullTaskRepository implements TaskReader, TaskWriter {
  // Read and write methods
}
```

### 3. Clear Dependencies
```typescript
// Clear what the service actually needs
class TaskService {
  constructor(
    private reader: TaskReader,      // Needs reading
    private writer: TaskWriter       // Needs writing
  ) {}
}
```

## 12. Practical Exercise

### Task: Refactor Fat Interface to Segregated Interfaces

**Given (Fat Interface):**

```typescript
interface ProjectService {
  // CRUD
  create(data: CreateProjectDto): Promise<Project>;
  update(id: string, data: Partial<Project>): Promise<Project>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Project | null>;
  
  // Members
  addMember(projectId: string, userId: string, role: string): Promise<void>;
  removeMember(projectId: string, userId: string): Promise<void>;
  updateMemberRole(projectId: string, userId: string, role: string): Promise<void>;
  getMembers(projectId: string): Promise<ProjectMember[]>;
  
  // Settings
  updateSettings(projectId: string, settings: ProjectSettings): Promise<void>;
  getSettings(projectId: string): Promise<ProjectSettings>;
  
  // Archive
  archive(projectId: string): Promise<void>;
  restore(projectId: string): Promise<void>;
  
  // Analytics
  getStats(projectId: string): Promise<ProjectStats>;
  getActivityLog(projectId: string): Promise<Activity[]>;
}
```

**Your Task:**
1. Split into logical, focused interfaces
2. Create implementations for each interface
3. Update services to depend on specific interfaces
4. Ensure no implementation is forced to implement unused methods

**Success Criteria:**
- ✅ Each interface has a single, clear responsibility
- ✅ Services depend only on interfaces they use
- ✅ Easy to test with mocks
- ✅ Flexible to implement partially

---

## Next Lesson

Continue to [Dependency Inversion Principle](05-dependency-inversion-principle.md)

---

**Remember:** Many small, focused interfaces are better than one large, general-purpose interface!
