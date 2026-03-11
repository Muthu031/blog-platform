# Dependency Inversion Principle (DIP)

> "Depend on abstractions, not on concretions." - Robert C. Martin

## 1. Concept Overview

The Dependency Inversion Principle states that high-level modules should not depend on low-level modules. Both should depend on **abstractions** (interfaces). This is the foundation of **Dependency Injection** and **Inversion of Control**.

**Key Rules:**
1. High-level modules should not import from low-level modules
2. Both should depend on abstractions (interfaces/abstract classes)
3. Abstractions should not depend on details
4. Details should depend on abstractions

## 2. Core Principles

### Bad (Violates DIP)

```typescript
// ❌ TaskService directly depends on concrete classes
class TaskService {
  private postgresRepo = new PostgresTaskRepository(); // Concrete!
  private gmailService = new GmailService(); // Concrete!
  
  async createTask(data: CreateTaskDto): Promise<Task> {
    const task = await this.postgresRepo.create(data);
    await this.gmailService.send('New task created');
    return task;
  }
}

// Problems:
// - Can't switch to MySQL without changing TaskService
// - Can't test without real database
// - Can't use different email providers
// - Tight coupling
```

### Good (Follows DIP)

```typescript
// ✅ Depend on abstractions
interface TaskRepository {
  create(data: CreateTaskDto): Promise<Task>;
  findById(id: string): Promise<Task | null>;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// High-level module depends on abstractions
class TaskService {
  constructor(
    private taskRepo: TaskRepository,      // Abstraction!
    private emailService: EmailService     // Abstraction!
  ) {}
  
  async createTask(data: CreateTaskDto): Promise<Task> {
    const task = await this.taskRepo.create(data);
    await this.emailService.send(
      data.assigneeEmail,
      'New Task',
      `You have a new task: ${task.title}`
    );
    return task;
  }
}

// Low-level implementations
class PostgresTaskRepository implements TaskRepository {
  async create(data: CreateTaskDto): Promise<Task> {
    return await db.task.create({ data });
  }
  
  async findById(id: string): Promise<Task | null> {
    return await db.task.findUnique({ where: { id } });
  }
}

class GmailService implements EmailService {
  async send(to: string, subject: string, body: string): Promise<void> {
    // Gmail implementation
  }
}

// Dependency Injection
const taskService = new TaskService(
  new PostgresTaskRepository(),
  new GmailService()
);
```

## 3. Why This Matters in Real Systems

### Benefits in Production:

**1. Testability**
```typescript
// Easy to test with mocks
class MockTaskRepository implements TaskRepository {
  async create(data: CreateTaskDto): Promise<Task> {
    return { id: '1', ...data } as Task;
  }
  
  async findById(id: string): Promise<Task | null> {
    return null;
  }
}

const testService = new TaskService(
  new MockTaskRepository(),
  new MockEmailService()
);
```

**2. Flexibility**
```typescript
// Switch implementations without changing business logic
const prodService = new TaskService(
  new PostgresTaskRepository(), // Production
  new SendGridService()
);

const devService = new TaskService(
  new InMemoryTaskRepository(), // Development
  new ConsoleEmailService()
);
```

**3. Multiple Implementations**
```typescript
// Different implementations for different scenarios
const services = {
  prod: new TaskService(new PostgresRepo(), new GmailService()),
  staging: new TaskService(new PostgresRepo(), new MailtrapService()),
  test: new TaskService(new InMemoryRepo(), new MockEmailService()),
};
```

## 4. Practical Examples

### Example 1: Repository Pattern

```typescript
// ======= Abstraction Layer =======
interface Repository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findMany(filter: any): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ======= Concrete Implementations =======

// PostgreSQL implementation
class PrismaRepository<T> implements Repository<T> {
  constructor(
    private model: any,
    private transform?: (data: any) => T
  ) {}
  
  async create(data: Partial<T>): Promise<T> {
    const result = await this.model.create({ data });
    return this.transform ? this.transform(result) : result;
  }
  
  async findById(id: string): Promise<T | null> {
    const result = await this.model.findUnique({ where: { id } });
    return result ? (this.transform ? this.transform(result) : result) : null;
  }
  
  async findMany(filter: any): Promise<T[]> {
    const results = await this.model.findMany(filter);
    return this.transform ? results.map(this.transform) : results;
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    const result = await this.model.update({ where: { id }, data });
    return this.transform ? this.transform(result) : result;
  }
  
  async delete(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }
}

// In-Memory implementation (for testing)
class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private items = new Map<string, T>();
  
  async create(data: Partial<T>): Promise<T> {
    const item = { ...data, id: generateId() } as T;
    this.items.set(item.id, item);
    return item;
  }
  
  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }
  
  async findMany(filter: any): Promise<T[]> {
    return Array.from(this.items.values());
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    const item = this.items.get(id);
    if (!item) throw new Error('Not found');
    
    const updated = { ...item, ...data };
    this.items.set(id, updated);
    return updated;
  }
  
  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

// ======= Service depends on abstraction =======
class TaskService {
  constructor(private taskRepo: Repository<Task>) {}
  
  async createTask(data: CreateTaskDto): Promise<Task> {
    return await this.taskRepo.create(data);
  }
}

// ======= Dependency Injection =======

// Production
const prodTaskService = new TaskService(
  new PrismaRepository(db.task)
);

// Testing
const testTaskService = new TaskService(
  new InMemoryRepository<Task>()
);
```

### Example 2: Cache Service Abstraction

```typescript
// ======= Abstraction =======
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// ======= Redis Implementation =======
class RedisCacheService implements CacheService {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  async clear(): Promise<void> {
    await this.redis.flushdb();
  }
}

// ======= In-Memory Implementation =======
class InMemoryCacheService implements CacheService {
  private cache = new Map<string, { value: any; expiry: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl * 1000
    });
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// ======= Service depends on abstraction =======
class UserService {
  constructor(
    private userRepo: Repository<User>,
    private cache: CacheService  // Abstraction!
  ) {}
  
  async getUserById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;
    
    // Try cache
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) return cached;
    
    // Fetch from database
    const user = await this.userRepo.findById(id);
    
    if (user) {
      await this.cache.set(cacheKey, user, 300);
    }
    
    return user;
  }
}

// ======= Dependency Injection =======

// Production (Redis)
const prodUserService = new UserService(
  new PrismaRepository(db.user),
  new RedisCacheService(redisClient)
);

// Development (In-Memory)
const devUserService = new UserService(
  new PrismaRepository(db.user),
  new InMemoryCacheService()
);

// Testing (In-Memory for both)
const testUserService = new UserService(
  new InMemoryRepository<User>(),
  new InMemoryCacheService()
);
```

### Example 3: Event Emitter Abstraction

```typescript
// ======= Abstraction =======
interface EventEmitter {
  emit(event: string, data: any): Promise<void>;
  on(event: string, handler: (data: any) => Promise<void>): void;
}

// ======= In-Process Implementation =======
class InProcessEventEmitter implements EventEmitter {
  private handlers = new Map<string, Array<(data: any) => Promise<void>>>();
  
  async emit(event: string, data: any): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    await Promise.all(handlers.map(h => h(data)));
  }
  
  on(event: string, handler: (data: any) => Promise<void>): void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }
}

// ======= Redis Pub/Sub Implementation =======
class RedisEventEmitter implements EventEmitter {
  constructor(
    private publisher: Redis,
    private subscriber: Redis
  ) {}
  
  async emit(event: string, data: any): Promise<void> {
    await this.publisher.publish(event, JSON.stringify(data));
  }
  
  on(event: string, handler: (data: any) => Promise<void>): void {
    this.subscriber.subscribe(event);
    this.subscriber.on('message', async (channel, message) => {
      if (channel === event) {
        const data = JSON.parse(message);
        await handler(data);
      }
    });
  }
}

// ======= Service depends on abstraction =======
class TaskService {
  constructor(
    private taskRepo: Repository<Task>,
    private events: EventEmitter  // Abstraction!
  ) {}
  
  async createTask(data: CreateTaskDto): Promise<Task> {
    const task = await this.taskRepo.create(data);
    
    // Emit event (implementation doesn't matter to this service)
    await this.events.emit('task.created', task);
    
    return task;
  }
}

// ======= Event Handlers =======
function setupEventHandlers(events: EventEmitter) {
  events.on('task.created', async (task: Task) => {
    await sendNotification(task);
  });
  
  events.on('task.created', async (task: Task) => {
    await logActivity(task);
  });
}

// ======= Dependency Injection =======

// Single server (in-process events)
const events = new InProcessEventEmitter();
const taskService = new TaskService(taskRepo, events);
setupEventHandlers(events);

// Multiple servers (Redis pub/sub)
const redisEvents = new RedisEventEmitter(publisher, subscriber);
const taskService = new TaskService(taskRepo, redisEvents);
setupEventHandlers(redisEvents);
```

## 5. Complete DI Container Setup

```typescript
// ======= Container =======
class DIContainer {
  private services = new Map<string, any>();
  
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }
  
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service;
  }
}

// ======= Setup =======
function setupContainer(): DIContainer {
  const container = new DIContainer();
  
  // Register low-level services
  container.register('cache', new RedisCacheService(redisClient));
  container.register('events', new RedisEventEmitter(publisher, subscriber));
  
  // Register repositories
  container.register('taskRepo', new PrismaRepository(db.task));
  container.register('userRepo', new PrismaRepository(db.user));
  
  // Register services (depend on abstractions)
  container.register('taskService', new TaskService(
    container.get('taskRepo'),
    container.get('events')
  ));
  
  container.register('userService', new UserService(
    container.get('userRepo'),
    container.get('cache')
  ));
  
  return container;
}

// ======= Usage =======
const container = setupContainer();

// Controllers get services from container
class TaskController {
  private taskService = container.get<TaskService>('taskService');
  
  async createTask(req: Request, res: Response) {
    const task = await this.taskService.createTask(req.body);
    res.json({ data: task });
  }
}
```

## 12. Practical Exercise

### Task: Implement Storage Abstraction

**Requirements:**
1. Create `StorageService` interface
2. Implement `LocalFileStorage` (saves to disk)
3. Implement `S3Storage` (saves to AWS S3)
4. Implement `InMemoryStorage` (for testing)
5. Create `FileUploadService` that depends on `StorageService`
6. Switch between implementations via configuration

**Implementation:**

```typescript
interface StorageService {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

class LocalFileStorage implements StorageService {
  async upload(file: Buffer, path: string): Promise<string> {
    // TODO: Implement local file storage
  }
  
  async download(path: string): Promise<Buffer> {
    // TODO: Implement
  }
  
  async delete(path: string): Promise<void> {
    // TODO: Implement
  }
  
  async exists(path: string): Promise<boolean> {
    // TODO: Implement
  }
}

class S3Storage implements StorageService {
  constructor(private s3Client: S3) {}
  
  async upload(file: Buffer, path: string): Promise<string> {
    // TODO: Implement S3 upload
  }
  
  async download(path: string): Promise<Buffer> {
    // TODO: Implement
  }
  
  async delete(path: string): Promise<void> {
    // TODO: Implement
  }
  
  async exists(path: string): Promise<boolean> {
    // TODO: Implement
  }
}

class FileUploadService {
  constructor(private storage: StorageService) {}
  
  async uploadAvatar(userId: string, file: Buffer): Promise<string> {
    const path = `avatars/${userId}.jpg`;
    return await this.storage.upload(file, path);
  }
}

// Configuration-based injection
const storage = config.env === 'production'
  ? new S3Storage(s3Client)
  : new LocalFileStorage();

const uploadService = new FileUploadService(storage);
```

**Success Criteria:**
- ✅ Service doesn't know which storage is used
- ✅ Easy to switch implementations
- ✅ Testable with in-memory storage
- ✅ No code changes needed to switch storage

---

## Next Lesson

Back to [SOLID Principles Overview](README.md)

---

**Remember:** Depend on abstractions, not concretions. This enables flexibility, testability, and maintainability!
