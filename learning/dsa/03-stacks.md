# Stacks - LIFO Operations

> Last In, First Out - Perfect for undo operations, history tracking, and call stacks

## 1. Concept Overview

A Stack is a linear data structure that follows the LIFO (Last In, First Out) principle. Think of it as a stack of plates - you can only add or remove from the top. In backend systems, stacks are essential for undo operations, parsing, navigation history, and function call management.

**Key Operations:**
- `push(item)`: Add to top - O(1)
- `pop()`: Remove from top - O(1)
- `peek()`: View top without removing - O(1)
- `isEmpty()`: Check if empty - O(1)

## 2. Core Principles

```typescript
class Stack<T> {
  private items: T[] = [];
  
  push(item: T): void {
    this.items.push(item);
  }
  
  pop(): T | undefined {
    return this.items.pop();
  }
  
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
}
```

## 3. Real-World Usage in SaaS

**1. Undo/Redo Operations**
- Notion: Track document edits
- Figma: Design changes history
- Trello: Card movement history

**2. Navigation History**
- Browser back/forward
- Breadcrumb navigation
- State management

**3. Expression Evaluation**
- Formula calculation
- Query parsing
- Template processing

## 4. Practical Examples

### Example 1: Undo/Redo System

```typescript
interface TaskStateSnapshot {
  taskId: string;
  state: Partial<Task>;
  timestamp: Date;
}

class TaskHistoryService {
  private undoStack: Stack<TaskStateSnapshot> = new Stack();
  private redoStack: Stack<TaskStateSnapshot> = new Stack();
  
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    // Get current state before update
    const currentTask = await db.task.findUnique({ where: { id: taskId } });
    
    // Save current state to undo stack
    this.undoStack.push({
      taskId,
      state: { ...currentTask },
      timestamp: new Date()
    });
    
    // Clear redo stack (can't redo after new action)
    this.redoStack = new Stack();
    
    // Perform update
    return await db.task.update({
      where: { id: taskId },
      data: updates
    });
  }
  
  async undo(userId: string): Promise<Task | null> {
    if (this.undoStack.isEmpty()) {
      return null;
    }
    
    const snapshot = this.undoStack.pop()!;
    
    // Get current state for redo
    const currentTask = await db.task.findUnique({
      where: { id: snapshot.taskId }
    });
    
    // Save current state to redo stack
    this.redoStack.push({
      taskId: snapshot.taskId,
      state: { ...currentTask },
      timestamp: new Date()
    });
    
    // Restore previous state
    return await db.task.update({
      where: { id: snapshot.taskId },
      data: snapshot.state
    });
  }
  
  async redo(userId: string): Promise<Task | null> {
    if (this.redoStack.isEmpty()) {
      return null;
    }
    
    const snapshot = this.redoStack.pop()!;
    
    // Get current state for undo
    const currentTask = await db.task.findUnique({
      where: { id: snapshot.taskId }
    });
    
    // Save to undo stack
    this.undoStack.push({
      taskId: snapshot.taskId,
      state: { ...currentTask },
      timestamp: new Date()
    });
    
    // Apply redo state
    return await db.task.update({
      where: { id: snapshot.taskId },
      data: snapshot.state
    });
  }
}
```

### Example 2: Navigation Breadcrumbs

```typescript
class NavigationStack {
  private history: Stack<string> = new Stack();
  
  navigate(path: string): void {
    this.history.push(path);
  }
  
  back(): string | null {
    if (this.history.size() <= 1) {
      return null;
    }
    
    this.history.pop(); // Remove current
    return this.history.peek() || null; // Return previous
  }
  
  getBreadcrumbs(): string[] {
    // Return all paths in stack
    return [...this.history['items']]; // Access private for read
  }
}

// Usage in controller
class NavigationController {
  private navStack = new NavigationStack();
  
  async enterProject(req: Request, res: Response) {
    const { projectId } = req.params;
    
    this.navStack.navigate(`/projects/${projectId}`);
    
    res.json({
      breadcrumbs: this.navStack.getBreadcrumbs()
    });
  }
}
```

### Example 3: Balanced Brackets Validator

```typescript
// Validate JSON structure, code validation
class BracketValidator {
  validate(expression: string): boolean {
    const stack = new Stack<string>();
    const pairs: Record<string, string> = {
      ')': '(',
      '}': '{',
      ']': '['
    };
    
    for (const char of expression) {
      // Opening bracket
      if (char === '(' || char === '{' || char === '[') {
        stack.push(char);
      }
      // Closing bracket
      else if (char === ')' || char === '}' || char === ']') {
        if (stack.isEmpty() || stack.pop() !== pairs[char]) {
          return false;
        }
      }
    }
    
    return stack.isEmpty(); // All opened brackets must be closed
  }
}

// Usage: Validate API filter expressions
const validator = new BracketValidator();
const isValid = validator.validate('(status == "TODO") && (priority > 5)');
```

## 12. Practical Exercise

### Task: Build a Task State History System

**Requirements:**
1. Track all state changes for tasks
2. Support undo (restore previous state)
3. Support redo (reapply undone change)
4. Limit history to last 50 changes per task
5. Store history in Redis for fast access
6. Add API endpoints for undo/redo

**Implementation:**

```typescript
interface StateChange {
  before: Partial<Task>;
  after: Partial<Task>;
  userId: string;
  timestamp: Date;
}

class TaskStateManager {
  private undoStacks = new Map<string, Stack<StateChange>>();
  private redoStacks = new Map<string, Stack<StateChange>>();
  private maxHistory = 50;
  
  async recordChange(
    taskId: string,
    before: Partial<Task>,
    after: Partial<Task>,
    userId: string
  ): Promise<void> {
    // TODO: Implement
  }
  
  async undo(taskId: string): Promise<Partial<Task> | null> {
    // TODO: Implement
  }
  
  async redo(taskId: string): Promise<Partial<Task> | null> {
    // TODO: Implement
  }
}
```

**Success Criteria:**
- ✅ All task changes are tracked
- ✅ Undo restores previous state
- ✅ Redo reapplies changes
- ✅ History limited to prevent memory issues
- ✅ Works across server restarts (Redis)

---

## Next Lesson

Continue to [Queues - FIFO Processing](04-queues.md)
