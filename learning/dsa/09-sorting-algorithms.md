# Sorting Algorithms - Efficient Data Organization

> Master sorting strategies, database ORDER BY optimization, and ranking systems

## 1. Core Sorting Algorithms

### Bubble Sort - O(n²)
```typescript
function bubbleSort<T>(array: T[]): T[] {
  const arr = [...array];
  
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  
  return arr;
}

// Use case: Small datasets, educational purposes
```

### Merge Sort - O(n log n)
```typescript
function mergeSort<T>(array: T[]): T[] {
  if (array.length <= 1) return array;
  
  const mid = Math.floor(array.length / 2);
  const left = mergeSort(array.slice(0, mid));
  const right = mergeSort(array.slice(mid));
  
  return merge(left, right);
}

function merge<T>(left: T[], right: T[]): T[] {
  const result: T[] = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return [...result, ...left.slice(i), ...right.slice(j)];
}

// Use case: Consistent O(n log n), stable sort
```

### Quick Sort - O(n log n) average, O(n²) worst
```typescript
function quickSort<T>(array: T[]): T[] {
  if (array.length <= 1) return array;
  
  const pivot = array[Math.floor(array.length / 2)];
  const left = array.filter(x => x < pivot);
  const middle = array.filter(x => x === pivot);
  const right = array.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// Use case: Fast average case, in-place sorting
```

## 2. Real-World Applications

### Example 1: Task Priority Ranking

```typescript
interface Task {
  id: string;
  priority: number;
  dueDate: Date;
  status: string;
  assigneeId: string;
}

class TaskRankingService {
  // Multi-criteria sorting
  rankTasks(tasks: Task[]): Task[] {
    return tasks.sort((a, b) => {
      // 1. Status priority (blocked > in-progress > todo > done)
      const statusPriority = {
        'blocked': 4,
        'in-progress': 3,
        'todo': 2,
        'done': 1
      };
      
      const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;
      
      // 2. Priority value (higher first)
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      
      // 3. Due date (earlier first)
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }
  
  // Database-level sorting (more efficient)
  async getRankedTasks(projectId: string): Promise<Task[]> {
    return db.task.findMany({
      where: { projectId },
      orderBy: [
        { status: 'desc' },
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });
  }
}
```

### Example 2: Leaderboard System

```typescript
interface UserStats {
  userId: string;
  tasksCompleted: number;
  points: number;
  lastActivity: Date;
}

class LeaderboardService {
  async getTopPerformers(
    organizationId: string,
    limit: number = 10
  ): Promise<UserStats[]> {
    // Use Redis sorted set for real-time rankings
    const key = `leaderboard:${organizationId}`;
    
    // Get top users by score
    const topUsers = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    
    // Fetch user details
    const userIds = topUsers.filter((_, i) => i % 2 === 0);
    const scores = topUsers.filter((_, i) => i % 2 === 1);
    
    const users = await db.user.findMany({
      where: { id: { in: userIds } }
    });
    
    return users.map((user, i) => ({
      userId: user.id,
      tasksCompleted: user.tasksCompleted,
      points: parseInt(scores[i]),
      lastActivity: user.updatedAt
    }));
  }
  
  async updateUserScore(userId: string, organizationId: string, points: number): Promise<void> {
    const key = `leaderboard:${organizationId}`;
    await redis.zincrby(key, points, userId);
  }
}
```

### Example 3: Activity Feed Sorting

```typescript
interface Activity {
  id: string;
  type: string;
  timestamp: Date;
  importance: number;
  userId: string;
}

class ActivityFeedService {
  // Time-decay algorithm (recent + important activities first)
  sortByRelevance(activities: Activity[]): Activity[] {
    const now = Date.now();
    
    return activities.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, now);
      const scoreB = this.calculateRelevanceScore(b, now);
      return scoreB - scoreA;
    });
  }
  
  private calculateRelevanceScore(activity: Activity, now: number): number {
    const ageHours = (now - activity.timestamp.getTime()) / (1000 * 60 * 60);
    const decayFactor = Math.exp(-ageHours / 24); // Exponential decay over 24h
    
    return activity.importance * decayFactor;
  }
  
  // Database implementation with SQL
  async getRelevantActivities(userId: string): Promise<Activity[]> {
    return db.$queryRaw`
      SELECT *,
        (importance * EXP(-(EXTRACT(EPOCH FROM (NOW() - timestamp)) / 3600) / 24)) as relevance_score
      FROM activities
      WHERE user_id = ${userId}
      ORDER BY relevance_score DESC
      LIMIT 50
    `;
  }
}
```

### Example 4: Search Results Ranking

```typescript
interface SearchResult {
  taskId: string;
  title: string;
  description: string;
  exactMatch: boolean;
  titleMatch: boolean;
  descriptionMatch: boolean;
}

class SearchRankingService {
  rankResults(results: SearchResult[], query: string): SearchResult[] {
    return results.sort((a, b) => {
      const scoreA = this.calculateScore(a, query);
      const scoreB = this.calculateScore(b, query);
      return scoreB - scoreA;
    });
  }
  
  private calculateScore(result: SearchResult, query: string): number {
    let score = 0;
    
    // Exact match gets highest score
    if (result.exactMatch) {
      score += 100;
    }
    
    // Title match is more important than description
    if (result.titleMatch) {
      score += 50;
    }
    
    if (result.descriptionMatch) {
      score += 25;
    }
    
    // Bonus for matching at the start
    const titleLower = result.title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (titleLower.startsWith(queryLower)) {
      score += 20;
    }
    
    // Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(titleLower, queryLower);
    score -= distance;
    
    return score;
  }
  
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
}
```

## 3. Database Sorting Optimization

### Efficient ORDER BY
```sql
-- Create composite index for common sorts
CREATE INDEX idx_tasks_project_priority_date ON tasks(project_id, priority DESC, due_date ASC);

-- This query uses the index
SELECT * FROM tasks
WHERE project_id = '123'
ORDER BY priority DESC, due_date ASC
LIMIT 20;

-- Avoid sorting large result sets
-- Bad: sorts 1M rows, returns 20
SELECT * FROM tasks
ORDER BY created_at DESC
LIMIT 20;

-- Good: filter first, then sort
SELECT * FROM tasks
WHERE project_id = '123'  -- Reduces to 1K rows
ORDER BY created_at DESC
LIMIT 20;
```

### Materialized Views for Complex Sorts
```sql
-- Pre-sorted view for frequently accessed data
CREATE MATERIALIZED VIEW task_leaderboard AS
SELECT 
  user_id,
  COUNT(*) as tasks_completed,
  AVG(priority) as avg_priority,
  MAX(completed_at) as last_completion
FROM tasks
WHERE status = 'done'
GROUP BY user_id
ORDER BY tasks_completed DESC, last_completion DESC;

-- Refresh periodically
REFRESH MATERIALIZED VIEW task_leaderboard;
```

## 12. Practical Exercise

### Task: Build a Smart Task Prioritization System

**Requirements:**
1. Rank tasks by multiple criteria (priority, due date, dependencies)
2. Consider task age and user workload
3. Support custom sorting rules
4. Cache sorted results
5. Update rankings in real-time

**Implementation:**

```typescript
interface PriorityTask {
  id: string;
  title: string;
  priority: number;
  dueDate: Date;
  createdAt: Date;
  assigneeId: string;
  dependencies: string[];
  estimatedHours: number;
}

interface SortingCriteria {
  field: 'priority' | 'dueDate' | 'age' | 'workload';
  direction: 'asc' | 'desc';
  weight: number;
}

class SmartTaskPrioritizationService {
  async rankTasks(
    projectId: string,
    criteria: SortingCriteria[]
  ): Promise<PriorityTask[]> {
    // TODO: Implement multi-criteria ranking
    // 1. Fetch tasks with dependencies
    // 2. Calculate workload per assignee
    // 3. Apply weighted scoring
    // 4. Handle dependencies (blocked tasks lower priority)
    // 5. Cache results in Redis sorted set
    // 6. Return ranked list
  }
  
  private calculateScore(task: PriorityTask, criteria: SortingCriteria[]): number {
    // TODO: Implement scoring algorithm
  }
  
  async updateTaskPriority(taskId: string): Promise<void> {
    // TODO: Recalculate and update rankings
  }
}
```

**Advanced Features:**
- Machine learning to predict task completion time
- Auto-adjust priorities based on deadlines
- Balance workload across team members
- Detect and resolve circular dependencies

**Success Criteria:**
- ✅ Handles 1000+ tasks efficiently
- ✅ Rankings update in real-time
- ✅ Supports custom sorting rules
- ✅ Cached for performance
- ✅ Respects task dependencies

---

## Completion

Congratulations! You've completed the Data Structures & Algorithms section.

**Next Steps:**
1. Review [SOLID Principles](../solid/README.md)
2. Apply these algorithms in your project
3. Practice with LeetCode/HackerRank
4. Study system design patterns

**Key Takeaways:**
- Choose the right algorithm for your use case
- Database sorting is often more efficient than in-memory
- Cache frequently sorted data
- Use indexes strategically
- Consider time-decay and relevance scoring for real-world applications
