# Trees - Hierarchical Data Structures

> Perfect for organization hierarchies, comment threads, file systems, and nested data

## 1. Concept Overview

Trees are hierarchical data structures with nodes connected by edges. Each node has one parent (except root) and zero or more children. Essential for representing organizational structures, comment threads, category hierarchies, and permission trees.

**Key Terms:**
- **Root**: Top node with no parent
- **Parent**: Node with children
- **Child**: Node with a parent
- **Leaf**: Node with no children
- **Depth**: Distance from root
- **Height**: Longest path from node to leaf

## 2. Core Principles

```typescript
class TreeNode<T> {
  value: T;
  children: TreeNode<T>[] = [];
  parent: TreeNode<T> | null = null;
  
  constructor(value: T) {
    this.value = value;
  }
  
  addChild(value: T): TreeNode<T> {
    const child = new TreeNode(value);
    child.parent = this;
    this.children.push(child);
    return child;
  }
  
  removeChild(child: TreeNode<T>): void {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }
}
```

## 3. Real-World Usage in SaaS

**1. Organization Hierarchies**
- Company → Departments → Teams → Members
- Multi-level organizational charts
- Permission inheritance

**2. Comment Threads**
- Nested comments (Reddit, Notion)
- Discussion trees
- Reply chains

**3. File Systems**
- Folders and files
- Project structures
- Document hierarchies

**4. Category Trees**
- Product categories
- Tag hierarchies
- Navigation menus

## 4. Practical Examples

### Example 1: Organization Hierarchy

```typescript
interface OrganizationNode {
  id: string;
  name: string;
  type: 'company' | 'department' | 'team';
  parentId: string | null;
  metadata?: any;
}

class OrganizationTree {
  async buildTree(organizationId: string): Promise<TreeNode<OrganizationNode>> {
    // Fetch all nodes
    const nodes = await db.organizationNode.findMany({
      where: { organizationId },
      orderBy: { level: 'asc' }
    });
    
    // Find root
    const root = nodes.find(n => n.parentId === null);
    if (!root) throw new Error('No root node');
    
    // Build tree
    const nodeMap = new Map<string, TreeNode<OrganizationNode>>();
    const rootTree = new TreeNode(root);
    nodeMap.set(root.id, rootTree);
    
    // Add children
    for (const node of nodes) {
      if (node.id === root.id) continue;
      
      const parent = nodeMap.get(node.parentId!);
      if (parent) {
        const childNode = parent.addChild(node);
        nodeMap.set(node.id, childNode);
      }
    }
    
    return rootTree;
  }
  
  findNode(root: TreeNode<OrganizationNode>, id: string): TreeNode<OrganizationNode> | null {
    // Depth-first search
    if (root.value.id === id) return root;
    
    for (const child of root.children) {
      const found = this.findNode(child, id);
      if (found) return found;
    }
    
    return null;
  }
  
  getAllDescendants(node: TreeNode<OrganizationNode>): OrganizationNode[] {
    const descendants: OrganizationNode[] = [];
    
    const traverse = (current: TreeNode<OrganizationNode>) => {
      for (const child of current.children) {
        descendants.push(child.value);
        traverse(child);
      }
    };
    
    traverse(node);
    return descendants;
  }
  
  getPath(node: TreeNode<OrganizationNode>): OrganizationNode[] {
    const path: OrganizationNode[] = [];
    let current: TreeNode<OrganizationNode> | null = node;
    
    while (current) {
      path.unshift(current.value);
      current = current.parent;
    }
    
    return path;
  }
}

// Usage: Get all users in a department and sub-departments
class UserService {
  constructor(private orgTree: OrganizationTree) {}
  
  async getUsersInDepartment(departmentId: string): Promise<User[]> {
    const root = await this.orgTree.buildTree('org-123');
    const deptNode = this.orgTree.findNode(root, departmentId);
    
    if (!deptNode) return [];
    
    // Get department + all child teams
    const descendants = this.orgTree.getAllDescendants(deptNode);
    const nodeIds = [departmentId, ...descendants.map(d => d.id)];
    
    return await db.user.findMany({
      where: {
        organizationNodeId: { in: nodeIds }
      }
    });
  }
}
```

### Example 2: Nested Comments

```typescript
interface Comment {
  id: string;
  text: string;
  userId: string;
  parentId: string | null;
  taskId: string;
  createdAt: Date;
}

class CommentTreeService {
  async buildCommentTree(taskId: string): Promise<TreeNode<Comment>> {
    const comments = await db.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' }
    });
    
    // Create virtual root
    const root = new TreeNode<Comment>({
      id: 'root',
      text: '',
      userId: '',
      parentId: null,
      taskId,
      createdAt: new Date()
    });
    
    const nodeMap = new Map<string, TreeNode<Comment>>();
    nodeMap.set('root', root);
    
    // Build tree
    for (const comment of comments) {
      const parentId = comment.parentId || 'root';
      const parent = nodeMap.get(parentId);
      
      if (parent) {
        const commentNode = parent.addChild(comment);
        nodeMap.set(comment.id, commentNode);
      }
    }
    
    return root;
  }
  
  async getCommentThread(commentId: string): Promise<Comment[]> {
    const comment = await db.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) return [];
    
    const tree = await this.buildCommentTree(comment.taskId);
    const commentNode = this.findNode(tree, commentId);
    
    if (!commentNode) return [];
    
    // Get path from root to this comment
    return this.getPath(commentNode);
  }
  
  async getReplies(commentId: string): Promise<Comment[]> {
    const comment = await db.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) return [];
    
    const tree = await this.buildCommentTree(comment.taskId);
    const commentNode = this.findNode(tree, commentId);
    
    if (!commentNode) return [];
    
    // Get all descendants (replies and nested replies)
    return this.getAllDescendants(commentNode);
  }
  
  private findNode(root: TreeNode<Comment>, id: string): TreeNode<Comment> | null {
    if (root.value.id === id) return root;
    
    for (const child of root.children) {
      const found = this.findNode(child, id);
      if (found) return found;
    }
    
    return null;
  }
  
  private getAllDescendants(node: TreeNode<Comment>): Comment[] {
    const descendants: Comment[] = [];
    
    for (const child of node.children) {
      descendants.push(child.value);
      descendants.push(...this.getAllDescendants(child));
    }
    
    return descendants;
  }
  
  private getPath(node: TreeNode<Comment>): Comment[] {
    const path: Comment[] = [];
    let current: TreeNode<Comment> | null = node;
    
    while (current && current.value.id !== 'root') {
      path.unshift(current.value);
      current = current.parent;
    }
    
    return path;
  }
}
```

### Example 3: Binary Search Tree (for sorted data)

```typescript
class BSTNode<T> {
  value: T;
  left: BSTNode<T> | null = null;
  right: BSTNode<T> | null = null;
  
  constructor(value: T) {
    this.value = value;
  }
}

class BinarySearchTree<T> {
  root: BSTNode<T> | null = null;
  
  constructor(private compare: (a: T, b: T) => number) {}
  
  insert(value: T): void {
    const node = new BSTNode(value);
    
    if (!this.root) {
      this.root = node;
      return;
    }
    
    let current = this.root;
    
    while (true) {
      if (this.compare(value, current.value) < 0) {
        // Go left
        if (!current.left) {
          current.left = node;
          break;
        }
        current = current.left;
      } else {
        // Go right
        if (!current.right) {
          current.right = node;
          break;
        }
        current = current.right;
      }
    }
  }
  
  find(value: T): BSTNode<T> | null {
    let current = this.root;
    
    while (current) {
      const cmp = this.compare(value, current.value);
      
      if (cmp === 0) return current;
      if (cmp < 0) current = current.left;
      else current = current.right;
    }
    
    return null;
  }
  
  inOrderTraversal(callback: (value: T) => void): void {
    const traverse = (node: BSTNode<T> | null) => {
      if (!node) return;
      
      traverse(node.left);
      callback(node.value);
      traverse(node.right);
    };
    
    traverse(this.root);
  }
}

// Usage: In-memory sorted cache
interface CachedTask {
  priority: number;
  task: Task;
}

class PriorityCacheService {
  private bst = new BinarySearchTree<CachedTask>(
    (a, b) => a.priority - b.priority
  );
  
  addTask(task: Task, priority: number): void {
    this.bst.insert({ priority, task });
  }
  
  getTasksInPriorityOrder(): Task[] {
    const tasks: Task[] = [];
    
    this.bst.inOrderTraversal(({ task }) => {
      tasks.push(task);
    });
    
    return tasks;
  }
}
```

## 5. Database Queries for Trees

### Adjacency List (Common Approach)

```sql
-- Table structure
CREATE TABLE organization_nodes (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES organization_nodes(id),
  name VARCHAR(255),
  type VARCHAR(50),
  organization_id UUID,
  level INT
);

-- Get all children
SELECT * FROM organization_nodes
WHERE parent_id = $1;

-- Get path to root (recursive CTE)
WITH RECURSIVE path AS (
  SELECT id, parent_id, name, 0 as depth
  FROM organization_nodes
  WHERE id = $1
  
  UNION ALL
  
  SELECT n.id, n.parent_id, n.name, p.depth + 1
  FROM organization_nodes n
  INNER JOIN path p ON n.id = p.parent_id
)
SELECT * FROM path ORDER BY depth DESC;

-- Get all descendants (recursive CTE)
WITH RECURSIVE descendants AS (
  SELECT id, parent_id, name, 0 as depth
  FROM organization_nodes
  WHERE id = $1
  
  UNION ALL
  
  SELECT n.id, n.parent_id, n.name, d.depth + 1
  FROM organization_nodes n
  INNER JOIN descendants d ON n.parent_id = d.id
)
SELECT * FROM descendants;
```

### Materialized Path (Faster Queries)

```sql
CREATE TABLE organization_nodes (
  id UUID PRIMARY KEY,
  path VARCHAR(1000), -- e.g., '/1/2/5/'
  name VARCHAR(255)
);

-- Get all descendants
SELECT * FROM organization_nodes
WHERE path LIKE '/1/2/%';

-- Get path
SELECT * FROM organization_nodes
WHERE id = ANY(string_to_array('/1/2/5/', '/')::uuid[])
ORDER BY path;
```

## 12. Practical Exercise

### Task: Build a Category Tree System

**Requirements:**
1. Support nested categories (unlimited depth)
2. Get all products in a category and subcategories
3. Get breadcrumb path for a category
4. Move categories (reparent)
5. Delete category and all descendants
6. Efficient queries using recursive CTEs

**Implementation:**

```typescript
class CategoryTreeService {
  async createCategory(name: string, parentId?: string): Promise<Category> {
    // TODO: Create category with parent
  }
  
  async getSubcategories(categoryId: string): Promise<Category[]> {
    // TODO: Get all categories under this one
  }
  
  async getBreadcrumb(categoryId: string): Promise<Category[]> {
    // TODO: Get path from root to category
  }
  
  async moveCategory(categoryId: string, newParentId: string): Promise<void> {
    // TODO: Reparent category
  }
  
  async deleteCategory(categoryId: string): Promise<void> {
    // TODO: Delete category and all descendants
  }
}
```

**Success Criteria:**
- ✅ Supports unlimited nesting depth
- ✅ Efficient queries for descendants
- ✅ Breadcrumb generation
- ✅ Safe category moves
- ✅ Cascade deletion

---

## Next Lesson

Continue to [Graphs - Relationships and Dependencies](06-graphs.md)
