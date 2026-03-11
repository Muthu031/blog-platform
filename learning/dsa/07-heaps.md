# Heaps - Priority Queues and Task Scheduling

> Efficiently manage prioritized data - perfect for task scheduling, top-K problems, and priority queues

## 1. Concept Overview

A Heap is a complete binary tree where each parent node is either greater than (max heap) or less than (min heap) its children. Essential for priority queues, scheduling algorithms, and finding top-K elements efficiently.

**Time Complexity:**
- Insert: O(log n)
- Remove min/max: O(log n)
- Peek min/max: O(1)
- Build heap: O(n)

## 2. Implementation

```typescript
class MinHeap<T> {
  private heap: T[] = [];
  
  constructor(private compareFn: (a: T, b: T) => number) {}
  
  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }
  
  private leftChild(i: number): number {
    return 2 * i + 1;
  }
  
  private rightChild(i: number): number {
    return 2 * i + 2;
  }
  
  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
  
  insert(value: T): void {
    this.heap.push(value);
    this.bubbleUp(this.heap.length - 1);
  }
  
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = this.parent(index);
      
      if (this.compareFn(this.heap[index], this.heap[parentIndex]) >= 0) {
        break;
      }
      
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }
  
  extractMin(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    
    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    
    return min;
  }
  
  private bubbleDown(index: number): void {
    while (true) {
      const left = this.leftChild(index);
      const right = this.rightChild(index);
      let smallest = index;
      
      if (left < this.heap.length && 
          this.compareFn(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      
      if (right < this.heap.length && 
          this.compareFn(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      
      if (smallest === index) break;
      
      this.swap(index, smallest);
      index = smallest;
    }
  }
  
  peek(): T | undefined {
    return this.heap[0];
  }
  
  size(): number {
    return this.heap.length;
  }
}
```

## 3. Real-World Applications

### Example 1: Priority Task Queue

```typescript
interface PriorityTask {
  id: string;
  priority: number; // 1 = highest
  dueDate: Date;
  title: string;
}

class TaskPriorityQueue {
  private heap: MinHeap<PriorityTask>;
  
  constructor() {
    this.heap = new MinHeap((a, b) => {
      // First by priority, then by due date
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }
  
  addTask(task: PriorityTask): void {
    this.heap.insert(task);
  }
  
  getNextTask(): PriorityTask | undefined {
    return this.heap.extractMin();
  }
  
  peekNextTask(): PriorityTask | undefined {
    return this.heap.peek();
  }
  
  hasTask(): boolean {
    return this.heap.size() > 0;
  }
}

// Usage
const queue = new TaskPriorityQueue();

queue.addTask({
  id: '1',
  priority: 5,
  dueDate: new Date('2026-03-15'),
  title: 'Normal task'
});

queue.addTask({
  id: '2',
  priority: 1,
  dueDate: new Date('2026-03-12'),
  title: 'Urgent task'
});

const nextTask = queue.getNextTask(); // Gets urgent task (priority 1)
```

### Example 2: Top K Frequent Tasks

```typescript
class TaskAnalyticsService {
  // Find top K most assigned users
  async getTopAssignees(projectId: string, k: number): Promise<Array<{ userId: string; count: number }>> {
    // Get all task assignments
    const assignments = await db.task.groupBy({
      by: ['assigneeId'],
      where: { projectId },
      _count: { assigneeId: true }
    });
    
    // Use max heap to find top K
    const heap = new MinHeap<{ userId: string; count: number }>(
      (a, b) => a.count - b.count // Min heap for top K
    );
    
    for (const assignment of assignments) {
      heap.insert({
        userId: assignment.assigneeId!,
        count: assignment._count.assigneeId
      });
      
      // Keep only K elements
      if (heap.size() > k) {
        heap.extractMin();
      }
    }
    
    // Extract all and reverse (largest first)
    const result: Array<{ userId: string; count: number }> = [];
    while (heap.size() > 0) {
      result.push(heap.extractMin()!);
    }
    
    return result.reverse();
  }
}
```

### Example 3: Scheduled Notifications

```typescript
interface ScheduledNotification {
  id: string;
  userId: string;
  message: string;
  sendAt: Date;
}

class NotificationScheduler {
  private heap: MinHeap<ScheduledNotification>;
  private processing = false;
  
  constructor() {
    this.heap = new MinHeap((a, b) =>
      a.sendAt.getTime() - b.sendAt.getTime()
    );
  }
  
  schedule(notification: ScheduledNotification): void {
    this.heap.insert(notification);
    
    if (!this.processing) {
      this.startProcessing();
    }
  }
  
  private async startProcessing(): Promise<void> {
    this.processing = true;
    
    while (this.heap.size() > 0) {
      const next = this.heap.peek();
      
      if (!next) break;
      
      const now = Date.now();
      const delay = next.sendAt.getTime() - now;
      
      if (delay <= 0) {
        // Time to send
        const notification = this.heap.extractMin()!;
        await this.sendNotification(notification);
      } else {
        // Wait until next notification
        await this.sleep(delay);
      }
    }
    
    this.processing = false;
  }
  
  private async sendNotification(notification: ScheduledNotification): Promise<void> {
    await db.notification.create({
      data: {
        userId: notification.userId,
        message: notification.message,
        sentAt: new Date()
      }
    });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 12. Practical Exercise

### Task: Build a Task Scheduler with Priorities and Dependencies

**Requirements:**
1. Schedule tasks by priority and due date
2. Support task dependencies (can't run until dependencies complete)
3. Process highest priority ready task first
4. Track completed tasks
5. Support concurrent worker pool

**Implementation:**

```typescript
interface ScheduledTask {
  id: string;
  priority: number;
  dueDate: Date;
  dependencies: string[];
  execute: () => Promise<void>;
}

class TaskScheduler {
  private readyQueue: MinHeap<ScheduledTask>;
  private waitingTasks: Map<string, ScheduledTask> = new Map();
  private completed: Set<string> = new Set();
  private concurrency: number;
  
  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
    this.readyQueue = new MinHeap((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }
  
  addTask(task: ScheduledTask): void {
    // TODO: Add task
    // If no dependencies, add to ready queue
    // Otherwise, add to waiting tasks
  }
  
  async processTask(task: ScheduledTask): Promise<void> {
    // TODO: Execute task
    // Mark as completed
    // Check if any waiting tasks are now ready
  }
  
  async run(): Promise<void> {
    // TODO: Process tasks with worker pool
  }
}
```

**Success Criteria:**
- ✅ Processes highest priority tasks first
- ✅ Respects task dependencies
- ✅ Runs multiple tasks concurrently
- ✅ Handles task failures gracefully

---

## Next Lesson

Continue to [Searching Algorithms](08-searching-algorithms.md)
