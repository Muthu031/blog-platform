# Graphs - Relationships and Networks

> Essential for modeling connections, dependencies, and relationships in your SaaS platform

## 1. Concept Overview

Graphs are data structures consisting of **nodes** (vertices) connected by **edges**. Perfect for representing relationships: user connections, project dependencies, workflow chains, and permission graphs.

**Key Concepts:**
- **Vertex/Node**: Entity in the graph
- **Edge**: Connection between nodes
- **Directed**: Edges have direction (A → B)
- **Undirected**: Edges are bidirectional (A ↔ B)
- **Weighted**: Edges have values/costs
- **Cycle**: Path that returns to starting node

## 2. Graph Representations

```typescript
// Adjacency List (most common)
class Graph<T> {
  private adjacencyList: Map<T, T[]> = new Map();
  
  addVertex(vertex: T): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }
  
  addEdge(vertex1: T, vertex2: T, directed: boolean = false): void {
    this.adjacencyList.get(vertex1)?.push(vertex2);
    
    if (!directed) {
      this.adjacencyList.get(vertex2)?.push(vertex1);
    }
  }
  
  getNeighbors(vertex: T): T[] {
    return this.adjacencyList.get(vertex) || [];
  }
}

// Adjacency Matrix (for dense graphs)
class GraphMatrix {
  private matrix: number[][];
  
  constructor(size: number) {
    this.matrix = Array(size).fill(0).map(() => Array(size).fill(0));
  }
  
  addEdge(from: number, to: number, weight: number = 1): void {
    this.matrix[from][to] = weight;
  }
  
  hasEdge(from: number, to: number): boolean {
    return this.matrix[from][to] !== 0;
  }
}
```

## 3. Real-World SaaS Applications

### Example 1: Task Dependencies

```typescript
interface Task {
  id: string;
  title: string;
  dependencies: string[]; // IDs of tasks that must complete first
}

class TaskDependencyGraph {
  private graph = new Map<string, Set<string>>();
  
  addTask(task: Task): void {
    if (!this.graph.has(task.id)) {
      this.graph.set(task.id, new Set());
    }
    
    // Add dependencies
    for (const depId of task.dependencies) {
      this.graph.get(depId)?.add(task.id);
    }
  }
  
  // Can task be started?
  canStart(taskId: string, completedTasks: Set<string>): boolean {
    const task = await db.task.findUnique({ where: { id: taskId } });
    
    if (!task) return false;
    
    // All dependencies must be completed
    return task.dependencies.every(depId => completedTasks.has(depId));
  }
  
  // Topological sort (order to execute tasks)
  getExecutionOrder(): string[] {
    const visited = new Set<string>();
    const stack: string[] = [];
    
    const dfs = (taskId: string) => {
      if (visited.has(taskId)) return;
      
      visited.add(taskId);
      
      const dependents = this.graph.get(taskId) || new Set();
      for (const dependent of dependents) {
        dfs(dependent);
      }
      
      stack.push(taskId);
    };
    
    for (const taskId of this.graph.keys()) {
      dfs(taskId);
    }
    
    return stack.reverse();
  }
  
  // Detect circular dependencies
  hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const dependents = this.graph.get(taskId) || new Set();
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          if (dfs(dependent)) return true;
        } else if (recursionStack.has(dependent)) {
          return true; // Cycle detected
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    for (const taskId of this.graph.keys()) {
      if (!visited.has(taskId)) {
        if (dfs(taskId)) return true;
      }
    }
    
    return false;
  }
}
```

### Example 2: Social Network / Team Connections

```typescript
class SocialGraph {
  private connections = new Map<string, Set<string>>();
  
  addConnection(user1: string, user2: string): void {
    if (!this.connections.has(user1)) {
      this.connections.set(user1, new Set());
    }
    if (!this.connections.has(user2)) {
      this.connections.set(user2, new Set());
    }
    
    this.connections.get(user1)!.add(user2);
    this.connections.get(user2)!.add(user1);
  }
  
  // Breadth-First Search: Find shortest path
  findShortestPath(start: string, end: string): string[] | null {
    const queue: Array<{ user: string; path: string[] }> = [
      { user: start, path: [start] }
    ];
    const visited = new Set<string>([start]);
    
    while (queue.length > 0) {
      const { user, path } = queue.shift()!;
      
      if (user === end) {
        return path;
      }
      
      const connections = this.connections.get(user) || new Set();
      for (const connection of connections) {
        if (!visited.has(connection)) {
          visited.add(connection);
          queue.push({
            user: connection,
            path: [...path, connection]
          });
        }
      }
    }
    
    return null; // No path found
  }
  
  // Find mutual connections
  findMutualConnections(user1: string, user2: string): string[] {
    const connections1 = this.connections.get(user1) || new Set();
    const connections2 = this.connections.get(user2) || new Set();
    
    return Array.from(connections1).filter(user => connections2.has(user));
  }
  
  // Suggest connections (friends of friends)
  suggestConnections(userId: string, limit: number = 5): string[] {
    const directConnections = this.connections.get(userId) || new Set();
    const suggestions = new Map<string, number>(); // userId → shared connections count
    
    // For each direct connection
    for (const connection of directConnections) {
      const theirConnections = this.connections.get(connection) || new Set();
      
      // Check their connections
      for (const potentialFriend of theirConnections) {
        // Skip if it's the user or already connected
        if (potentialFriend === userId || directConnections.has(potentialFriend)) {
          continue;
        }
        
        // Count shared connections
        suggestions.set(
          potentialFriend,
          (suggestions.get(potentialFriend) || 0) + 1
        );
      }
    }
    
    // Sort by shared connections count
    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId]) => userId);
  }
}
```

### Example 3: Permission Inheritance Graph

```typescript
interface Role {
  id: string;
  name: string;
  inheritsFrom: string[]; // Parent role IDs
  permissions: string[];
}

class RoleGraph {
  private graph = new Map<string, Role>();
  
  addRole(role: Role): void {
    this.graph.set(role.id, role);
  }
  
  // Get all permissions (including inherited)
  getAllPermissions(roleId: string): Set<string> {
    const permissions = new Set<string>();
    const visited = new Set<string>();
    
    const dfs = (currentRoleId: string) => {
      if (visited.has(currentRoleId)) return;
      
      visited.add(currentRoleId);
      const role = this.graph.get(currentRoleId);
      
      if (!role) return;
      
      // Add direct permissions
      role.permissions.forEach(p => permissions.add(p));
      
      // Add inherited permissions
      role.inheritsFrom.forEach(parentId => dfs(parentId));
    };
    
    dfs(roleId);
    return permissions;
  }
  
  // Check if user has permission
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });
    
    if (!user) return false;
    
    for (const role of user.roles) {
      const allPermissions = this.getAllPermissions(role.id);
      if (allPermissions.has(permission)) {
        return true;
      }
    }
    
    return false;
  }
}
```

## 4. Graph Traversal Algorithms

### Breadth-First Search (BFS)
```typescript
function bfs<T>(graph: Map<T, T[]>, start: T): T[] {
  const visited: T[] = [];
  const queue: T[] = [start];
  const seen = new Set<T>([start]);
  
  while (queue.length > 0) {
    const vertex = queue.shift()!;
    visited.push(vertex);
    
    const neighbors = graph.get(vertex) || [];
    for (const neighbor of neighbors) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return visited;
}
```

### Depth-First Search (DFS)
```typescript
function dfs<T>(graph: Map<T, T[]>, start: T): T[] {
  const visited: T[] = [];
  const seen = new Set<T>();
  
  function explore(vertex: T) {
    if (seen.has(vertex)) return;
    
    seen.add(vertex);
    visited.push(vertex);
    
    const neighbors = graph.get(vertex) || [];
    for (const neighbor of neighbors) {
      explore(neighbor);
    }
  }
  
  explore(start);
  return visited;
}
```

## 12. Practical Exercise

### Task: Build a Project Dependency System

**Requirements:**
1. Model tasks with dependencies as a graph
2. Validate no circular dependencies exist
3. Generate execution order (topological sort)
4. Find which tasks can be executed in parallel
5. Calculate critical path (longest sequence)

**Implementation:**

```typescript
class ProjectDependencyService {
  async addTaskDependency(taskId: string, dependsOn: string): Promise<void> {
    // TODO: Add dependency
    // Validate no cycle is created
  }
  
  async getExecutionOrder(projectId: string): Promise<string[]> {
    // TODO: Return topological sort of tasks
  }
  
  async getParallelBatches(projectId: string): Promise<string[][]> {
    // TODO: Group tasks that can execute in parallel
  }
  
  async getCriticalPath(projectId: string): Promise<string[]> {
    // TODO: Find longest path through dependencies
  }
}
```

**Success Criteria:**
- ✅ Detects and prevents circular dependencies
- ✅ Generates valid execution order
- ✅ Identifies parallel execution opportunities
- ✅ Calculates critical path correctly

---

## Next Lesson

Continue to [Heaps - Priority Queues](07-heaps.md)
