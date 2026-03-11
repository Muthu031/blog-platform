# Testing Strategies - Building Confidence in Your Code

> Write comprehensive tests: unit, integration, and end-to-end

## 1. Core Concepts

### Testing Pyramid

```
         E2E Tests (5%)
        /            \\
       /  Integration \\ 
      /     Tests (15%) \\
     /____________________\\
    Unit Tests (80%)

Coverage:
- Unit: Test individual functions/classes
- Integration: Test multiple components together
- E2E: Test complete user workflows
```

## 2. Real-World Applications

### Example 1: Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('TaskService', () => {
  let service: TaskService;
  let mockRepository: MockTaskRepository;
  
  beforeEach(() => {
    mockRepository = new MockTaskRepository();
    service = new TaskService(mockRepository);
  });
  
  describe('createTask', () => {
    it('should create a task with valid data', async () => {
      const data = {
        title: 'Test Task',
        organizationId: 'org-1',
        projectId: 'proj-1'
      };
      
      const result = await service.createTask(data);
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Task');
      expect(mockRepository.create).toHaveBeenCalledWith(data);
    });
    
    it('should throw error for invalid title', async () => {
      const data = {
        title: '',
        organizationId: 'org-1',
        projectId: 'proj-1'
      };
      
      await expect(service.createTask(data)).rejects.toThrow('Title is required');
    });
  });
});
```

### Example 2: Mocking Dependencies

```typescript
class MockTaskRepository implements ITaskRepository {
  private tasks: Task[] = [];
  
  async create(data: CreateTaskData): Promise<Task> {
    const task = { id: generateId(), ...data };
    this.tasks.push(task);
    return task;
  }
  
  async findById(id: string): Promise<Task | null> {
    return this.tasks.find(t => t.id === id) || null;
  }
  
  async findMany(query: any): Promise<Task[]> {
    return this.tasks.filter(t => {
      if (query.organizationId && t.organizationId !== query.organizationId) return false;
      if (query.status && t.status !== query.status) return false;
      return true;
    });
  }
  
  async update(id: string, updates: any): Promise<Task> {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new Error('Not found');
    
    Object.assign(task, updates);
    return task;
  }
}
```

### Example 3: Integration Tests

```typescript
describe('Task API Integration', () => {
  let app: Express;
  let db: PrismaClient;
  
  beforeAll(async () => {
    db = new PrismaClient();
    app = createApp(db);
  });
  
  afterEach(async () => {
    // Clean database after each test
    await db.task.deleteMany({});
  });
  
  it('should create task and retrieve it', async () => {
    // Create organization
    const org = await db.organization.create({
      data: { name: 'Test Org', plan: 'starter' }
    });
    
    // Create user
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        organizationId: org.id,
        role: 'admin'
      }
    });
    
    // Create project
    const project = await db.project.create({
      data: {
        name: 'Test Project',
        organizationId: org.id
      }
    });
    
    // Create task via API
    const response = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${generateToken(user)}`)
      .send({
        title: 'Integration Test Task',
        projectId: project.id,
        priority: 1
      });
    
    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Integration Test Task');
    
    // Verify in database
    const task = await db.task.findUnique({
      where: { id: response.body.id }
    });
    
    expect(task).toBeDefined();
    expect(task.organizationId).toBe(org.id);
  });
});
```

### Example 4: End-to-End Tests

```typescript
describe('User Task Workflow E2E', () => {
  it('should complete full user journey', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    try {
      // 1. Navigate to login
      await page.goto('http://localhost:3000/login');
      
      // 2. Login
      await page.type('[name="email"]', 'user@example.com');
      await page.type('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForSelector('[data-testid="task-list"]');
      
      // 3. Create task
      await page.click('[data-testid="create-task-btn"]');
      await page.type('[name="title"]', 'My New Task');
      await page.select('[name="priority"]', '1');
      await page.click('button[type="submit"]');
      
      // 4. Verify task appears
      await page.waitForSelector('[data-testid="task-item:My New Task"]');
      
      const task = await page.$('[data-testid="task-item:My New Task"]');
      expect(task).toBeTruthy();
      
      // 5. Update task
      await task?.click();
      await page.click('[data-testid="edit-task-btn"]');
      await page.type('[name="description"]', 'Task description');
      await page.click('button[type="submit"]');
      
      // 6. Verify update
      await page.waitForSelector('[data-testid="task-description"]');
      const desc = await page.$text('[data-testid="task-description"]');
      expect(desc).toContain('Task description');
    } finally {
      await browser.close();
    }
  });
});
```

### Example 5: Performance Tests

```typescript
describe('Performance Tests', () => {
  it('should fetch 1000 tasks in < 500ms', async () => {
    // Create 1000 tasks
    await db.task.createMany({
      data: Array.from({ length: 1000 }, (_, i) => ({
        title: `Task ${i}`,
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: 'todo',
        priority: Math.random() * 10
      }))
    });
    
    const start = Date.now();
    const tasks = await db.task.findMany({
      where: { organizationId: 'org-1' },
      take: 100
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
    expect(tasks).toHaveLength(100);
  });
});
```

### Example 6: Test Coverage

```typescript
// Generate coverage report
npm run test:coverage

// Output:
// ======================== Coverage summary ========================
// Statements   : 85% ( 425/500 )
// Branches     : 72% ( 216/300 )
// Functions    : 80% ( 160/200 )
// Lines        : 87% ( 435/500 )
// ====================================================================
```

## 3. Continuous Testing

```typescript
// Run tests on every commit
// .husky/pre-commit
npm run test:unit
npm run test:integration

// Run full suite before pushing
// .husky/pre-push
npm run test:all
npm run test:coverage
```

## 12. Practical Exercise

### Build Comprehensive Test Suite

**Requirements:**
1. Unit tests for services
2. Integration tests for API
3. E2E tests for workflows
4. Mock external dependencies
5. Achieve 80%+ coverage

### Structure

```typescript
describe('Complete Task System Tests', () => {
  // TODO: Unit tests for TaskService
  // TODO: Integration tests for API endpoints
  // TODO: E2E tests for user workflows
  // TODO: Performance tests
  // TODO: Security tests
});
```

---

## Next Lesson

Continue to [Monitoring & Observability](05-monitoring-observability.md)
