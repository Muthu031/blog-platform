// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Organization Types
export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  user: User;
  role: OrganizationRole;
  joinedAt: string;
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface InviteMembersRequest {
  emails: string[];
  role: OrganizationRole;
}

// Project Types
export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string;
  status: ProjectStatus;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  role: 'owner' | 'lead' | 'member';
  joinedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  key: string;
  description?: string;
  color?: string;
}

// Board Types
export interface Board {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ColumnType = 'todo' | 'in-progress' | 'done' | 'custom';

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  type: ColumnType;
  position: number;
  createdAt: string;
}

// Task Types
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'done';

export interface Task {
  id: string;
  projectId: string;
  boardId: string;
  columnId: string;
  key: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
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

export interface TaskLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  action: string;
  changes?: Record<string, any>;
  createdAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  labelsIds?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  labelsIds?: string[];
}

// Filter and Search Types
export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  labelIds?: string[];
  searchQuery?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  status: number;
  errors?: Record<string, string[]>;
}

// Form Types
export interface FormFieldError {
  message: string;
}

export interface FormErrors {
  [key: string]: FormFieldError;
}
