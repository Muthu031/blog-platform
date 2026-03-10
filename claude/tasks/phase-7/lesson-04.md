# Lesson 4: Code Refactoring

## 🎯 Goal
Refactor codebase for maintainability, readability, and performance.

## 📚 What You'll Learn
- Identify refactoring opportunities
- Apply SOLID principles
- Reduce code duplication
- Improve code organization

## 📋 Prerequisites
- Completed Phase 7 Lessons 1-3
- All tests passing
- Understanding of code patterns

## 🛠️ Tasks

### 1. Setup Code Quality Tools

```bash
npm install --save-dev eslint prettier sonarqube-scanner
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 2. Configure ESLint

Create `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "@typescript-eslint/explicit-function-return-types": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"]
  }
}
```

### 3. Example Refactoring: Extract Service

Before:
```typescript
// In controller - mixing concerns
router.post('/projects', async (req, res) => {
  const { name, slug } = req.body;
  
  // Validation
  if (!name || !slug) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  // Business logic
  const existingProject = await prisma.project.findUnique({
    where: { slug }
  });
  
  if (existingProject) {
    return res.status(400).json({ error: 'Slug exists' });
  }
  
  const project = await prisma.project.create({
    data: { name, slug, organizationId: req.user.organizationId }
  });
  
  // Logging
  await prisma.activityLog.create({
    data: {
      action: 'project_created',
      entityType: 'project',
      entityId: project.id,
      userId: req.user.id
    }
  });
  
  res.json(project);
});
```

After:
```typescript
// Separate concerns
class ProjectValidator {
  static validateCreateInput(data: any) {
    if (!data.name || !data.slug) {
      throw new Error('Name and slug required');
    }
  }
}

class ProjectService {
  async createProject(organizationId: string, userId: string, data: any) {
    ProjectValidator.validateCreateInput(data);
    
    await this.checkSlugUniqueness(data.slug);
    
    const project = await prisma.project.create({
      data: {
        name: data.name,
        slug: data.slug,
        organizationId
      }
    });
    
    await this.logActivity('project_created', project.id, userId);
    
    return project;
  }
  
  private async checkSlugUniqueness(slug: string) {
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (existing) {
      throw new Error('Project slug already exists');
    }
  }
  
  private async logActivity(action: string, projectId: string, userId: string) {
    await prisma.activityLog.create({
      data: {
        action,
        entityType: 'project',
        entityId: projectId,
        userId
      }
    });
  }
}

// Clean controller
router.post('/projects', authenticate, async (req, res) => {
  try {
    const service = new ProjectService();
    const project = await service.createProject(
      req.user.organizationId,
      req.user.id,
      req.body
    );
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### 4. Identify DRY Violations

Before:
```typescript
// Repeated in multiple controllers
router.get('/tasks/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id }
    });
    if (!task) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });
    if (!project) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

After:
```typescript
// Reusable pattern
const getById = (model: any) => async (req: any, res: any) => {
  try {
    const item = await model.findUnique({
      where: { id: req.params.id }
    });
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

router.get('/tasks/:id', authenticate, getById(prisma.task));
router.get('/projects/:id', authenticate, getById(prisma.project));
```

### 5. Add Type Safety

Before:
```typescript
function updateTask(taskId, data) {
  return prisma.task.update({
    where: { id: taskId },
    data
  });
}
```

After:
```typescript
interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: 'todo' | 'in-progress' | 'done';
}

async function updateTask(
  taskId: string,
  data: UpdateTaskInput
): Promise<Task> {
  return prisma.task.update({
    where: { id: taskId },
    data: validateTaskUpdate(data)
  });
}

function validateTaskUpdate(data: UpdateTaskInput): UpdateTaskInput {
  const validated: UpdateTaskInput = {};
  
  if (data.title) validated.title = data.title.trim();
  if (data.description) validated.description = data.description.trim();
  if (data.assigneeId) validated.assigneeId = data.assigneeId;
  if (data.status && ['todo', 'in-progress', 'done'].includes(data.status)) {
    validated.status = data.status;
  }
  
  return validated;
}
```

## ✅ Verification Checklist

- [ ] ESLint configured and passing
- [ ] Prettier formatting applied
- [ ] Dead code removed
- [ ] Duplicate code extracted
- [ ] Type safety improved
- [ ] Services separated from controllers
- [ ] Error handling consistent
- [ ] All tests still passing
- [ ] Code coverage maintained
- [ ] Performance benchmarks reviewed

## 📚 Resources

- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Refactoring Patterns](https://refactoring.guru/refactoring)
