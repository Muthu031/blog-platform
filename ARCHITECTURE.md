# ProjectPal - Architecture & Design Patterns

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│                    (Frontend React App)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │   Pages Layer    │      │  Components      │                │
│  │  (UI Screens)    │  →   │  (Reusable)      │                │
│  └──────────────────┘      └──────────────────┘                │
│           ↓                         ↓                            │
│  ┌──────────────────────────────────────────────┐               │
│  │     Layout Components (Header, Sidebar)      │               │
│  └──────────────────────────────────────────────┘               │
│           ↓                                                       │
│  ┌──────────────────────────────────────────────┐               │
│  │    Form Handling (React Hook Form + Zod)     │               │
│  └──────────────────────────────────────────────┘               │
│                         ↓                                         │
│  ┌──────────────────────────────────────────────┐               │
│  │  State Management (Zustand - Global Store)   │               │
│  └──────────────────────────────────────────────┘               │
│           ↓                                                       │
│  ┌──────────────────────────────────────────────┐               │
│  │   Data Fetching (TanStack Query - Caching)   │               │
│  │                                               │               │
│  │  ┌────────────────────────────────────────┐  │               │
│  │  │     Custom Hooks (useProjects, etc)    │  │               │
│  │  └────────────────────────────────────────┘  │               │
│  └──────────────────────────────────────────────┘               │
│                         ↓                                         │
│  ┌──────────────────────────────────────────────┐               │
│  │   API Client Layer (Axios with Auth)         │               │
│  │  - Request/Response Interceptors              │               │
│  │  - Token Management                           │               │
│  │  - Error Handling                             │               │
│  └──────────────────────────────────────────────┘               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/HTTPS ↓
┌─────────────────────────────────────────────────────────────────┐
│                       NETWORK LAYER                              │
│                  (API Requests/Responses)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/HTTPS ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                           │
│                  (Node.js + Express + DB)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
<App>
  ├─ <Router>
  │   ├─ <Routes>
  │   │   ├─ Route("/login")
  │   │   │   └─ <LoginPage>
  │   │   ├─ Route("/org/:orgSlug")
  │   │   │   └─ <AppLayout>
  │   │   │       ├─ <Sidebar>
  │   │   │       ├─ <Header>
  │   │   │       └─ <DashboardPage>
  │   │   ├─ Route("/org/:orgSlug/projects")
  │   │   │   └─ <AppLayout>
  │   │   │       └─ <ProjectsListPage>
  │   │   └─ Route("/org/:orgSlug/project/:projectId/board")
  │   │       └─ <AppLayout>
  │   │           └─ <BoardPage>
  │   │               ├─ <DragDropContext>
  │   │               │   ├─ <Droppable>
  │   │               │   │   └─ <Draggable>
  │   │               │   │       └─ <TaskCard>
  │   │               └─ <Modal>
  │   └─ <Toaster> (Notifications)
  └─ <QueryClientProvider>
```

## Data Flow Architecture

### Authentication Flow

```
User Login
    ↓
[LoginPage]
    ↓
useForm + Zod Validation
    ↓
Form Submit
    ↓
apiClient.login(email, password)
    ↓
Axios POST /api/auth/login
    ↓
[Backend Processing]
    ↓
Response: { access_token, user }
    ↓
useAuthStore.login(user, token)
    ↓
Store saved to localStorage
    ↓
Navigate to /org/{slug}
    ↓
[DashboardPage Renders]
    ↓
Protected Routes Activate
```

### Project Fetching Flow

```
[DashboardPage Mounts]
    ↓
useProjects(organizationId)
    ↓
[TanStack Query]
    ├─ Check cache
    ├─ If miss, execute queryFn
    │   ↓
    │   apiClient.getProjects(orgId)
    │   ↓
    │   Axios GET /api/organizations/{orgId}/projects
    │   ↓
    │   [Backend Processing]
    │   ↓
    │   Response: Project []
    │   ↓
    └─ Update cache
    ↓
Hook returns { data, isLoading, error }
    ↓
Component renders with data
    ↓
[User Creates New Project]
    ↓
useCreateProject().mutate({
    organizationId,
    data: { name, key, description }
})
    ↓
apiClient.createProject(orgId, data)
    ↓
Axios POST /api/organizations/{orgId}/projects
    ↓
[Backend Processing]
    ↓
Response: Project (new)
    ↓
queryClient.invalidateQueries(['projects', orgId])
    ↓
Cache invalidated
    ↓
useProjects refetches automatically
    ↓
UI updates with new project
```

### Task Management Flow

```
User Views Board
    ↓
[BoardPage Mounts]
    ↓
useBoardColumns(boardId)
useTasks(boardId, filters)
    ↓
[TanStack Query fetches both]
    ↓
[Board Renders with Tasks in Columns]
    ├─ Column: To Do (3 tasks)
    ├─ Column: In Progress (2 tasks)
    └─ Column: Done (5 tasks)
    ↓
User Drags Task
    ↓
<DragDropContext onDragEnd>
    ↓
useMoveTask().mutate({
    taskId,
    columnId,
    position
})
    ↓
apiClient.moveTask(taskId, columnId, position)
    ↓
Axios PATCH /api/tasks/{taskId}
    ↓
[Backend updates task position]
    ↓
queryClient.invalidateQueries(['tasks'])
    ↓
Board re-fetches and re-renders
    ↓
User Sees Updated Board
```

## State Management Architecture

### Zustand Store Pattern

```
Store Definition:
┌────────────────────────────────────────┐
│  useAuthStore = create()(              │
│    devtools(                           │
│      persist(                          │
│        (set) => ({                     │
│          // State                      │
│          user: null,                   │
│          token: null,                  │
│          isAuthenticated: false,       │
│          // Actions                    │
│          login: (user, token) => ...,  │
│          logout: () => ...,            │
│        }),                             │
│        { name: 'auth-store' }  // Persist to localStorage
│      )                         // DevTools integration
│    )                                   │
│  )                                     │
└────────────────────────────────────────┘

Usage in Components:
┌────────────────────────────────────────┐
│  const user = useAuthStore(s => s.user)│
│  const login = useAuthStore(s => s.login)
│  const logout = useAuthStore(s => s.logout)
│                                        │
│  // Selector optimization:            │
│  const user = useAuthStore.use.user()  │
└────────────────────────────────────────┘
```

## API Client Architecture

### Request Handling

```
API Call Request:
    ↓
[App Code]
    ↓
apiClient.getProjects(orgId)
    ↓
[Axios Instance]
    ├─ Append auth headers
    │   GET /api/organizations/{orgId}/projects
    │   Authorization: Bearer {token}
    ├─ Add base URL prefix
    │   http://localhost:3000/api + endpoint
    └─ Set content-type: application/json
    ↓
[Request Interceptor]
    ├─ Check for token in localStorage
    ├─ Attach Authorization header
    └─ Continue request
    ↓
[Network Request]
    ↓
HTTP GET http://localhost:3000/api/organizations/{orgId}/projects
    ↓
[Backend Processing]
    ↓
Response
    ↓
[Response Interceptor]
    ├─ Check status code
    ├─ If 401: Remove token, redirect to /login
    └─ Handle errors
    ↓
[Error Handler or Success Handler]
    ↓
Return data/error to component
```

## Component Communication Pattern

```
Parent Component
    ↓
const { data, mutate } = useCustomHook()
    ↓
Pass data as props
    ├─ <Child data={data} />
    ├─ <Child onAction={mutate} />
    └─ <Child loading={isLoading} />
    ↓
Child Component
    ├─ Receives props
    ├─ Renders with data
    └─ Calls parent actions through props
    ↓
User Interaction
    ↓
onAction(payload)
    ↓
mutate(data)
    ↓
API Call
    ↓
Cache Invalidation
    ↓
Parent re-fetches
    ↓
Props Update
    ↓
Child Re-renders with New Data
```

## Form Handling Pattern

```
Form Component:
    ↓
const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})
    ↓
const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema)
})
    ↓
<form onSubmit={handleSubmit(onSubmit)}>
    <Input {...register('email')} error={formState.errors.email?.message} />
    <Button type="submit" loading={isSubmitting}>
        Submit
    </Button>
</form>
    ↓
User Fills Form
    ↓
User Clicks Submit
    ↓
handleSubmit triggers
    ↓
Zod validates
    ↓
If invalid: Show errors
If valid: Call onSubmit
    ↓
API Call via Hook
    ↓
Success/Error Notification
    ↓
Reset Form or Navigate
```

## Styling Architecture

### Tailwind CSS Utility Classes

```
Component Styling Pattern:
┌──────────────────────────────────────┐
│  Base Classes                         │
│  └─ p-4 (padding)                    │
│  └─ rounded-lg (border-radius)       │
│  └─ bg-white (background)            │
│  └─ shadow-sm (box-shadow)           │
├─ State Classes                       │
│  └─ hover:shadow-md                  │
│  └─ hover:bg-gray-50                 │
│  └─ active:bg-gray-100               │
│  └─ disabled:opacity-50              │
├─ Responsive Classes                  │
│  └─ md:p-6 (medium screens)          │
│  └─ lg:p-8 (large screens)           │
│  └─ hidden md:block (hidden on mobile)
├─ Variant Classes (via conditional)  │
│  └─ variant === 'primary' && 'bg-blue-600'
│  └─ variant === 'danger' && 'bg-red-600'
├─ Merge with cn()                    │
│  └─ cn('px-4', condition && 'bg-blue', className)
└─ Custom Colors via config           │
   └─ bg-primary (extends config)
```

## Performance Optimization Points

### 1. Code Splitting
```
Vite handles chunk splitting for routes:
    ↓
/login → LoginPage chunk
/dashboard → DashboardPage chunk
/board → BoardPage chunk
    ↓
Lazy loaded on route navigation
```

### 2. Query Caching
```
useProjects(orgId)
    ↓ First call
    → Fetches from API
    → Caches in TanStack Query
    ↓ Second call (within staleTime)
    → Returns cached data immediately
    ↓ After staleTime expires
    → Background refetch in progress
    → Returns cached while fetching
    ↓ Mutation invalidates cache
    → queryClient.invalidateQueries()
    → Next fetch gets fresh data
```

### 3. Memoization
```
Expensive Component
    ↓
Use React.memo()
    ↓
Only re-renders if props change
    ↓
Prevents unnecessary renders
```

## Error Handling Architecture

```
User Action
    ↓
Try to execute
    ↓
├─ API Error
│   ├─ ApiClient.handleError()
│   ├─ Return typed ApiError
│   └─ Component shows error message
│
├─ Validation Error
│   ├─ Zod catches invalid data
│   └─ Shows field-level errors
│
└─ Network Error
    ├─ Axios interceptor catches
    ├─ Check status code
    │   ├─ 401 → Logout & redirect
    │   ├─ 404 → Show not found
    │   └─ 500 → Show server error
    └─ useNotificationStore.addNotification()
        └─ Toast notification appears
```

## Security Considerations

### Token Management
```
On Login:
    ↓ Receive token
    ↓ Store in useAuthStore (persisted to localStorage)
    ↓ apiClient injects into Authorization header

On Every Request:
    ├─ Request interceptor
    ├─ Get token from localStorage
    ├─ Add to Authorization header
    └─ Send request

On Logout:
    ├─ Remove token from store
    ├─ Clear localStorage
    └─ Redirect to /login

On 401 Response:
    ├─ Token expired/invalid
    ├─ Clear auth
    └─ Redirect to /login
```

### Protected Routes
```
<ProtectedRoute>
    ├─ Check isAuthenticated from store
    │   ├─ If true → Render component
    │   └─ If false → Redirect to /login
    └─ Additional checks can be added:
        ├─ User role
        ├─ Organization membership
        └─ Resource permissions
```

## Deployment Architecture

```
Development:
    npm run dev
    ├─ Vite dev server (port 5173)
    ├─ HMR enabled
    └─ Source maps enabled

Production:
    npm run build
    ├─ Build optimizations
    ├─ Tree-shaking
    ├─ Code splitting
    ├─ CSS minification
    └─ JS minification
    ↓
    dist/ folder generated
    ├─ index.html
    ├─ assets/
    │   ├─ main.[hash].js (app code)
    │   ├─ vendor.[hash].js (dependencies)
    │   ├─ pages/
    │   │   └─ [route].[hash].js (chunk splits)
    │   └─ [hash].css (combined CSS)
    └─ assets/
        └─ images (optimized)

Deployment:
    Upload dist/ to:
    ├─ Vercel (automatic)
    ├─ Netlify (automatic)
    ├─ AWS S3 + CloudFront (static)
    ├─ Azure Static Web Apps
    └─ Any web server (nginx, Apache)
```

## Monitoring & Analytics Points

```
Track:
    ├─ Page views (React Router)
    ├─ User interactions (button clicks)
    ├─ API call performance (Axios)
    ├─ Error events (ApiClient errors)
    ├─ Form submissions
    ├─ Feature usage
    ├─ Performance metrics
    └─ User behavior

Implementation:
    ├─ Error tracking → Sentry
    ├─ Analytics → Mixpanel/Amplitude
    ├─ Performance → Web Vitals
    └─ APM → New Relic
```

## Type Safety Flow

```
Backend Response
    ↓ Define interface
    (src/types/index.ts)
    ↓
const response: Project = await apiClient.getProject()
    ↓
const projects: Project[] = response
    ↓
Pass to component
    ↓
<ProjectCard project={project} />
    ↓
Component props typed
    ↓
interface ProjectCardProps { project: Project }
    ↓ TypeScript compiler
    ├─ Ensures project has all properties
    ├─ Ensures correct types used
    └─ Catches errors at compile time
    ↓
Renders safely
```

## Directory Organization Benefits

```
src/
├── components/    → All visual elements organized
├── features/      → Feature-specific logic grouped
├── pages/         → Route-based views
├── hooks/         → Reusable logic
├── services/      → API communication
├── store/         → Global state
├── types/         → Type definitions
├── utils/         → Helper functions
├── layout/        → Page layouts
├── App.tsx        → Root component
└── main.tsx       → Entry point

Benefits:
✅ Easy to locate files
✅ Clear separation of concerns
✅ Scalable as app grows
✅ Easy to onboard new developers
✅ Supports parallel development
✅ Clear dependency direction
✅ Easy to test
✅ Easy to refactor
```

## Future Extensibility Points

### Adding New Features
```
1. Create types in src/types
2. Create API methods in src/services/api.ts
3. Create hooks in src/hooks
4. Create store if needed in src/store
5. Create components in src/components/features/{feature}
6. Create pages in src/pages
7. Add routes to src/App.tsx
8. Add navigation items
```

### Adding New UI Components
```
1. Create component in src/components/ui/{component}.tsx
2. Export from src/components/ui/index.ts
3. Use cn() for merging classes
4. Add comprehensive props interface
5. Handle all states (loading, disabled, error)
6. Use Tailwind for all styling
```

---

This architecture follows industry best practices and is designed to scale to thousands of users across multiple organizations. All components are built for reusability, maintainability, and performance.
