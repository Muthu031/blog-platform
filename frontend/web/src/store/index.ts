import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Organization, Project, Task } from '@types';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        login: (user, token) => {
          if (token) localStorage.setItem('auth_token', token);
          set({ user, token, isAuthenticated: true });
        },
        logout: () => {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null, isAuthenticated: false });
        },
        setUser: (user) => set({ user }),
        setToken: (token) => {
          if (token) localStorage.setItem('auth_token', token);
          else localStorage.removeItem('auth_token');
          set({ token, isAuthenticated: Boolean(token) });
        },
      }),
      {
        name: 'auth-store',
      }
    )
  )
);

interface OrganizationState {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (org: Organization) => void;
  setOrganizations: (orgs: Organization[]) => void;
  addOrganization: (org: Organization) => void;
  clear: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    persist(
      (set) => ({
        currentOrganization: null,
        organizations: [],
        setCurrentOrganization: (org) => set({ currentOrganization: org }),
        setOrganizations: (orgs) => set({ organizations: orgs }),
        addOrganization: (org) => set((state) => ({ organizations: [...state.organizations, org] })),
        clear: () => set({ currentOrganization: null, organizations: [] }),
      }),
      {
        name: 'organization-store',
      }
    )
  )
);

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set) => ({
        currentProject: null,
        projects: [],
        setCurrentProject: (project) => set({ currentProject: project }),
        setProjects: (projects) => set({ projects }),
        addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
        updateProject: (project) => set((state) => ({
          projects: state.projects.map((p) => (p.id === project.id ? project : p)),
          currentProject: state.currentProject?.id === project.id ? project : state.currentProject,
        })),
      }),
      {
        name: 'project-store',
      }
    )
  )
);

interface BoardState {
  selectedFilterStatus: string[];
  selectedFilterPriority: string[];
  selectedFilterAssignee: string | null;
  setFilterStatus: (status: string[]) => void;
  setFilterPriority: (priority: string[]) => void;
  setFilterAssignee: (assignee: string | null) => void;
  clearFilters: () => void;
}

export const useBoardStore = create<BoardState>()(
  devtools(
    persist(
      (set) => ({
        selectedFilterStatus: [],
        selectedFilterPriority: [],
        selectedFilterAssignee: null,
        setFilterStatus: (status) => set({ selectedFilterStatus: status }),
        setFilterPriority: (priority) => set({ selectedFilterPriority: priority }),
        setFilterAssignee: (assignee) => set({ selectedFilterAssignee: assignee }),
        clearFilters: () => set({
          selectedFilterStatus: [],
          selectedFilterPriority: [],
          selectedFilterAssignee: null,
        }),
      }),
      {
        name: 'board-store',
      }
    )
  )
);

interface TaskState {
  selectedTask: Task | null;
  showTaskModal: boolean;
  setSelectedTask: (task: Task | null) => void;
  setShowTaskModal: (show: boolean) => void;
}

export const useTaskStore = create<TaskState>()((set) => ({
  selectedTask: null,
  showTaskModal: false,
  setSelectedTask: (task) => set({ selectedTask: task }),
  setShowTaskModal: (show) => set({ showTaskModal: show }),
}));

interface NotificationState {
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'invalid' | 'system' | 'info';
  }>;
  addNotification: (message: string, type: 'success' | 'error' | 'warning' | 'invalid' | 'system' | 'info') => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  addNotification: (message, type) => {
    const id = Math.random().toString(36).substring(7);

    // Primary UX surface: toast notifications.
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'warning':
        toast(message, { icon: '!' });
        break;
      case 'invalid':
        toast.error(message);
        break;
      case 'system':
        toast.error(message);
        break;
      case 'info':
        toast(message);
        break;
      case 'error':
      default:
        toast.error(message);
        break;
    }

    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
