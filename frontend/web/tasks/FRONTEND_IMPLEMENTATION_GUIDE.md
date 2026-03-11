# ProjectPal - Implementation Guide

## Overview

ProjectPal is a production-ready, multi-tenant project management UI built with React, TypeScript, and Tailwind CSS. It follows modern SaaS architecture patterns similar to Jira, Linear, and Notion.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React App)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Pages     │  │  Components  │  │   Features   │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │ Login        │  │ UI Lib       │  │ Auth         │       │
│  │ Dashboard    │  │ Layout       │  │ Organizations
│  │ Projects     │  │ Forms        │  │ Projects     │       │
│  │ Board        │  │ Tables       │  │ Boards       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    Hooks     │  │   Services   │  │    Store     │       │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│  │ useProjects  │  │ API Client   │  │ useAuthStore │       │
│  │ useTasks     │  │ axios        │  │ useOrgStore  │       │
│  │ etc.         │  │ headers/auth │  │ useProjectSt │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │          Routing & State Management               │       │
│  │  React Router • Zustand • TanStack Query         │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP\HTTPS ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend API                              │
│              (Node.js + Express + TypeORM)                  │
│                                                               │
│  /api/auth           /api/organizations  /api/projects      │
│  /api/tasks          /api/boards         /api/columns       │
│  /api/comments       /api/labels         /api/activities    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ ↓ ↓
                    [PostgreSQL DB]
```

## Project Organization

### 1. Components Layer (`src/components/`)

#### UI Components (`src/components/ui/`)
Reusable, unstyled components that follow accessibility standards:

```typescript
// Button Component
<Button 
  variant="primary" | "secondary" | "danger" | "ghost" | "outline"
  size="sm" | "md" | "lg"
  loading={false}
  fullWidth={false}
  icon={<Icon />}
/>

// Input Component
<Input 
  label="Email"
  placeholder="you@example.com"
  error={errors.email?.message}
  icon={<SearchIcon />}
  iconPosition="left" | "right"
  {...register('email')}
/>

// Card Component
<Card hoverable className="p-6">
  Content here
</Card>

// Badge Component
<Badge 
  variant="primary" | "success" | "warning" | "danger" | "info"
  size="sm" | "md"
>
  Status
</Badge>

// Avatar Component
<Avatar 
  name="John Doe"
  avatar="https://..."
  size="sm" | "md" | "lg"
/>

// Modal Component
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Task"
  description="Add a new task to your board"
  size="sm" | "md" | "lg" | "xl"
  footer={<Footer />}
>
  Content
</Modal>

// And many more: Spinner, Checkbox, Select, Textarea, Alert, 
// Progress, Skeleton, EmptyState, Tooltip, Tabs, Pagination, etc.
```

#### Layout Components (`src/components/layout/`)
- **Sidebar**: Collapsible navigation with dynamic menu items
- **Header**: Top bar with workspace switcher, search, notifications
- **AppLayout**: Main layout wrapper

### 2. Pages Layer (`src/pages/`)

#### LoginPage
- Email/password form with Zod validation
- Sign up link
- Forgot password flow
- Error handling

#### DashboardPage
- Project cards grid
- Statistics cards (projects, members, tasks)
- Team members list
- Recent activity
- Quick actions

#### ProjectsListPage
- Projects table with sorting
- Search functionality
- Filters
- Row actions (view, edit, delete)
- Pagination

#### BoardPage
- Kanban board with multiple columns
- Drag-and-drop tasks between columns
- Task cards with priority and assignee
- Column management
- New task modal
- Filters sidebar

### 3. Hooks Layer (`src/hooks/`)

Custom React hooks that handle data fetching and mutations:

```typescript
// Query Hooks (TanStack Query)
const { data, isLoading, error } = useProjects(organizationId);
const { data, isLoading } = useProject(projectId);
const { data, isLoading } = useTasks(boardId, filters);

// Mutation Hooks
const { mutate, isLoading } = useCreateProject();
const { mutate, isLoading } = useCreateTask();
const { mutate, isLoading } = useUpdateTask();
const { mutate, isLoading } = useMoveTask();
const { mutate, isLoading } = useDeleteTask();

// Usage:
const createProject = useCreateProject();
createProject.mutate({
  organizationId: 'org-id',
  data: {
    name: 'New Project',
    key: 'NP',
    description: 'Project description'
  }
});
```

All hooks handle:
- Automatic cache invalidation
- Error notifications
- Success notifications
- Retry logic
- Loading states

### 4. Services Layer (`src/services/`)

Centralized API client with typed methods:

```typescript
// Authentication
apiClient.login(email, password)
apiClient.signup(email, password, name)
apiClient.forgotPassword(email)
apiClient.resetPassword(token, password)
apiClient.getCurrentUser()

// Organizations
apiClient.getOrganizations()
apiClient.getOrganization(slug)
apiClient.createOrganization(data)
apiClient.updateOrganization(slug, data)
apiClient.getOrganizationMembers(orgId)
apiClient.inviteOrganizationMembers(orgId, data)

// Projects
apiClient.getProjects(orgId)
apiClient.getProject(projectId)
apiClient.createProject(orgId, data)
apiClient.updateProject(projectId, data)
apiClient.deleteProject(projectId)
apiClient.getProjectMembers(projectId)

// Tasks
apiClient.getTasks(boardId, filters)
apiClient.getTask(taskId)
apiClient.createTask(columnId, data)
apiClient.updateTask(taskId, data)
apiClient.moveTask(taskId, columnId, position)
apiClient.deleteTask(taskId)

// Comments
apiClient.getTaskComments(taskId)
apiClient.createTaskComment(taskId, data)
apiClient.deleteTaskComment(commentId)

// And more...
```

Features:
- Base URL management
- Authorization header injection
- Request/response interceptors
- Error handling
- Token refresh logic

### 5. State Management (`src/store/`)

Zustand stores for global state:

#### Auth Store
```typescript
const { user, token, isAuthenticated } = useAuthStore();
useAuthStore(state => state.login(user, token));
useAuthStore(state => state.logout());
```

#### Organization Store
```typescript
const { currentOrganization, organizations } = useOrganizationStore();
useOrganizationStore(state => state.setCurrentOrganization(org));
useOrganizationStore(state => state.setOrganizations(orgs));
```

#### Project Store
```typescript
const { currentProject, projects } = useProjectStore();
useProjectStore(state => state.setCurrentProject(project));
useProjectStore(state => state.setProjects(projects));
```

#### Board Store (Filters)
```typescript
useBoard Store(state => state.selectedFilterStatus);
useBoardStore(state => state.setFilterStatus(status));
useBoardStore(state => state.setFilterPriority(priority));
useBoardStore(state => state.clearFilters());
```

#### Task Store
```typescript
useTaskStore(state => state.selectedTask);
useTaskStore(state => state.setSelectedTask(task));
useTaskStore(state => state.setShowTaskModal(true));
```

#### Notification Store
```typescript
const { addNotification, removeNotification } = useNotificationStore();
addNotification('Task updated!', 'success');
addNotification('Error occurred', 'error');
```

### 6. Types Layer (`src/types/`)

Complete TypeScript definitions:

```typescript
// User & Auth
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

// Organization
interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  user: User;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

// Project
interface Project {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// Board
interface Board {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  type: 'todo' | 'in-progress' | 'done' | 'custom';
  position: number;
  createdAt: string;
}

// Task
interface Task {
  id: string;
  projectId: string;
  boardId: string;
  columnId: string;
  key: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'in-review' | 'done';
  priority: 'none' | 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  assignee?: User;
  reporterId: string;
  reporter: User;
  labels: TaskLabel[];
  dueDate?: string;
  estimate?: number;
  position: number;
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activities: TaskActivity[];
  createdAt: string;
  updatedAt: string;
}

// And many more...
```

### 7. Utilities Layer (`src/utils/`)

Helper functions:

```typescript
// Class name merging
cn('px-4 py-2', condition && 'bg-blue-500')

// Formatting
formatBytes(1024) // "1 KB"
formatDate(new Date()) // "Mar 11, 2024"
formatDateTime(new Date()) // "Mar 11, 2024 2:30 PM"
getRelativeTime(new Date()) // "2 hours ago"

// String utilities
truncate(text, 50)
toSlug(text) // converts to kebab-case
getInitials(name) // "JD" from "John Doe"

// Function utilities
debounce(fn, 300)
throttle(fn, 1000)

// Data utilities
generateId()
isValidEmail(email)
getColorFromText(text)
getAvatarColor(userId)

// Other
delay(1000) // Promise-based delay
getQueryParams(location.search)
```

## Data Flow

### 1. Page Component Renders
```
LoginPage
  ↓
useForm(zodResolver(schema))
  ↓
handleSubmit on form submission
```

### 2. API Call
```
Form submit
  ↓
apiClient.login(email, password)
  ↓
axios POST /api/auth/login
  ↓
Response received
```

### 3. State Update
```
API Success
  ↓
useAuthStore.login(user, token)
  ↓ 
Store persisted to localStorage
  ↓
Component re-renders
```

### 4. Navigation
```
Authentication successful
  ↓
navigate('/org/org-slug')
  ↓
Router renders Dashboard
```

### 5. Data Fetching
```
Dashboard mounts
  ↓
useProjects(orgId) executes
  ↓
TanStack Query caches response
  ↓
Components render with data
  ↓
Auto-invalidation on mutations
```

## Component Patterns

### Creating a New Page Component
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@components/ui';
import { useMyData } from '@hooks';
import { cn } from '@utils';

export function MyPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useMyData(projectId);

  if (isLoading) return <Spinner />;
  if (error) return <Alert variant="danger">Error loading data</Alert>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Page</h1>
      {data && data.map(item => (
        <Card key={item.id} hoverable>
          <h2>{item.title}</h2>
        </Card>
      ))}
    </div>
  );
}
```

### Creating a Reusable Component
```typescript
import { cn } from '@utils';

interface MyComponentProps {
  title: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({
  title,
  variant = 'primary',
  className,
  children
}: MyComponentProps) {
  return (
    <div className={cn('p-4 rounded-lg', variant === 'primary' && 'bg-blue-50', className)}>
      <h2 className="font-bold">{title}</h2>
      {children}
    </div>
  );
}
```

### Using Forms with Validation
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input, Button } from '@components/ui';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 chars'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

type FormData = z.infer<typeof schema>;

export function CreateTaskForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createTask = useCreateTask();

  const onSubmit = (data: FormData) => {
    createTask.mutate({
      columnId: 'col-id',
      data
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title"
        placeholder="Enter task title"
        error={errors.title?.message}
        {...register('title')}
      />
      <Input
        label="Description"
        placeholder="Task description"
        as="textarea"
        {...register('description')}
      />
      <select {...register('priority')}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <Button type="submit" loading={createTask.isPending}>
        Create Task
      </Button>
    </form>
  );
}
```

## Styling Approach

Using Tailwind CSS utility-first approach:

```typescript
// ✅ GOOD - Use Tailwind utilities
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all">
  <h1 className="text-xl font-bold text-gray-900">Title</h1>
</div>

// ❌ BAD - Don't use CSS-in-JS or inline styles
<div style={{ display: 'flex', padding: '16px' }}>
  <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Title</h1>
</div>

// Use cn() for conditional styling
<div className={cn(
  'p-4 rounded-lg',
  isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600',
  className
)}>
  Content
</div>
```

## Error Handling

### API Errors
```typescript
try {
  await apiClient.createProject(data);
} catch (error) {
  const apiError = ApiClient.handleError(error);
  console.error(apiError.message);
  addNotification(apiError.message, 'error');
}
```

### Component Error Boundaries
```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <MyComponent />
</ErrorBoundary>
```

### Form Validation Errors
```typescript
{errors.email && (
  <p className="text-sm text-red-600">{errors.email.message}</p>
)}
```

## Performance Optimization

1. **Code Splitting**
   - Routes are automatically split by Vite
   - Use lazy loading for heavy components

2. **Query Caching**
   - TanStack Query caches data automatically
   - Configure staleTime for refresh intervals

3. **Memoization**
   - Use React.memo for expensive components
   - Use useMemo for expensive computations

4. **Bundle Size**
   - Keep dependencies minimal
   - Tree-shake unused code

## Testing

Example test structure:
```typescript
// LoginPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('should render login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should show error for invalid email', async () => {
    render(<LoginPage />);
    const button = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(button);
    // expect error message
  });
});
```

## Deployment Checklist

- [ ] Build production bundle (`npm run build`)
- [ ] Test production build locally (`npm run preview`)
- [ ] Update environment variables
- [ ] Configure API URL for production
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics
- [ ] Run lighthouse audit
- [ ] Test on various browsers and devices
- [ ] Deploy to hosting platform

## Next Steps

1. **Backend Integration**: Connect all API endpoints
2. **Real-time Features**: Add WebSocket for live updates
3. **Authentication**: Implement OAuth/SSO
4. **File Uploads**: Add file upload for attachments
5. **Notifications**: Add WebSocket-based notifications
6. **Search**: Implement full-text search
7. **Export**: Add PDF/Excel export functionality
8. **Mobile App**: Create mobile version using React Native

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)

---

Built with ❤️ following modern SaaS architecture patterns
