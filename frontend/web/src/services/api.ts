import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@types';
import { apiRoutes } from './apiRoutes';
import { useAuthStore } from '@store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: { message?: string; statusCode?: number; code?: string } };

function extractErrorDetails(error: AxiosError): { message: string; code: string; status: number } {
  const status = error.response?.status ?? 500;
  const data: any = error.response?.data;
  const message =
    data?.error?.message ||
    data?.message ||
    error.message ||
    'An unknown error occurred';
  const code =
    data?.error?.code ||
    data?.code ||
    error.code ||
    'UNKNOWN_ERROR';

  return { message, code, status };
}

export class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      // Required for httpOnly refresh-token cookies.
      withCredentials: true,
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().token || localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { status, code } = extractErrorDetails(error);

        // Force password reset flow before allowing access to the app.
        if (status === 428 && code === 'PASSWORD_RESET_REQUIRED') {
          if (window.location.pathname !== '/reset-password') {
            window.location.href = '/reset-password';
          }
          return Promise.reject(error);
        }

        // Tenant access denied is treated as an auth failure for this app UX.
        if (status === 403 && code === 'TENANT_ACCESS_DENIED') {
          useAuthStore.getState().logout();
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const originalRequest: any = error.config;
        const isAuthRefreshCall = originalRequest?.url?.includes(apiRoutes.auth.refresh());

        if (status === 401 && !isAuthRefreshCall && !originalRequest?._retry) {
          originalRequest._retry = true;

          const newToken = await this.refreshAccessToken();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          }

          useAuthStore.getState().logout();
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.client
        .post<ApiSuccess<{ accessToken: string }>>(apiRoutes.auth.refresh())
        .then((res) => res.data?.data?.accessToken || null)
        .then((token) => {
          if (token) {
            localStorage.setItem('auth_token', token);
            useAuthStore.getState().setToken(token);
          }
          return token;
        })
        .catch(() => null)
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    return this.refreshPromise;
  }

  // Auth
  async register(email: string, name: string) {
    const response = await this.client.post<ApiSuccess<{ user: any }>>(
      apiRoutes.auth.register(),
      { email, name }
    );
    return response.data?.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post(apiRoutes.auth.login(), { email, password });
    return (response.data as any)?.data ?? response.data;
  }

  async me() {
    const response = await this.client.get<ApiSuccess<any>>(apiRoutes.auth.me());
    return response.data?.data;
  }

  async logout() {
    const response = await this.client.post(apiRoutes.auth.logout());
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.post(apiRoutes.auth.changePassword(), {
      currentPassword,
      newPassword,
    });
    return (response.data as any)?.data ?? response.data;
  }

  // Organizations
  async getOrganizations() {
    const response = await this.client.get<ApiSuccess<any[]>>(apiRoutes.organizations.list());
    return response.data?.data ?? [];
  }

  async getOrganization(orgIdOrSlug: string) {
    const response = await this.client.get<ApiSuccess<any>>(apiRoutes.organizations.get(orgIdOrSlug));
    return response.data?.data;
  }

  async getOrganizationMembers(orgIdOrSlug: string) {
    const response = await this.client.get<ApiSuccess<any[]>>(apiRoutes.organizations.members(orgIdOrSlug));
    return response.data?.data ?? [];
  }

  async createOrganization(data: { name: string; slug: string }) {
    const response = await this.client.post<ApiSuccess<any>>(apiRoutes.organizations.create(), data);
    return response.data?.data;
  }

  // Projects
  async getProjects(orgIdOrSlug: string) {
    const response = await this.client.get<ApiSuccess<any[]>>(apiRoutes.projects.list(orgIdOrSlug));
    return response.data?.data ?? [];
  }

  async createProject(orgIdOrSlug: string, data: any) {
    const response = await this.client.post<ApiSuccess<any>>(apiRoutes.projects.create(orgIdOrSlug), data);
    return response.data?.data;
  }

  async getProject(orgIdOrSlug: string, projectId: string) {
    const response = await this.client.get<ApiSuccess<any>>(apiRoutes.projects.get(orgIdOrSlug, projectId));
    return response.data?.data;
  }

  async updateProject(orgIdOrSlug: string, projectId: string, data: any) {
    const response = await this.client.put<ApiSuccess<any>>(apiRoutes.projects.update(orgIdOrSlug, projectId), data);
    return response.data?.data;
  }

  async deleteProject(orgIdOrSlug: string, projectId: string) {
    const response = await this.client.delete(apiRoutes.projects.delete(orgIdOrSlug, projectId));
    return response.data;
  }

  // Boards
  async getBoards(orgIdOrSlug: string, projectId: string) {
    const response = await this.client.get<ApiSuccess<any[]>>(apiRoutes.projects.boards.list(orgIdOrSlug, projectId));
    return response.data?.data ?? [];
  }

  async createBoard(orgIdOrSlug: string, projectId: string, data: any) {
    const response = await this.client.post<ApiSuccess<any>>(apiRoutes.projects.boards.create(orgIdOrSlug, projectId), data);
    return response.data?.data;
  }

  // Tasks
  async getColumnTasks(orgIdOrSlug: string, projectId: string, columnId: string) {
    const response = await this.client.get<ApiSuccess<any[]>>(apiRoutes.tasks.columns.list(orgIdOrSlug, projectId, columnId));
    return response.data?.data ?? [];
  }

  async createTask(orgIdOrSlug: string, projectId: string, columnId: string, data: any) {
    const response = await this.client.post<ApiSuccess<any>>(apiRoutes.tasks.columns.create(orgIdOrSlug, projectId, columnId), data);
    return response.data?.data;
  }

  async getTask(orgIdOrSlug: string, projectId: string, taskId: string) {
    const response = await this.client.get<ApiSuccess<any>>(apiRoutes.tasks.get(orgIdOrSlug, projectId, taskId));
    return response.data?.data;
  }

  async updateTask(orgIdOrSlug: string, projectId: string, taskId: string, data: any) {
    const response = await this.client.put<ApiSuccess<any>>(apiRoutes.tasks.update(orgIdOrSlug, projectId, taskId), data);
    return response.data?.data;
  }

  async moveTask(orgIdOrSlug: string, projectId: string, taskId: string, columnId: string, position: number) {
    const response = await this.client.patch<ApiSuccess<any>>(apiRoutes.tasks.move(orgIdOrSlug, projectId, taskId), { columnId, position });
    return response.data?.data;
  }

  async assignTask(orgIdOrSlug: string, projectId: string, taskId: string, userId: string) {
    const response = await this.client.patch<ApiSuccess<any>>(apiRoutes.tasks.assign(orgIdOrSlug, projectId, taskId), { userId });
    return response.data?.data;
  }

  async unassignTask(orgIdOrSlug: string, projectId: string, taskId: string) {
    const response = await this.client.patch<ApiSuccess<any>>(apiRoutes.tasks.unassign(orgIdOrSlug, projectId, taskId));
    return response.data?.data;
  }

  async deleteTask(orgIdOrSlug: string, projectId: string, taskId: string) {
    const response = await this.client.delete(apiRoutes.tasks.delete(orgIdOrSlug, projectId, taskId));
    return response.data;
  }

  // Error handler
  static handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const details = extractErrorDetails(error);
      return {
        message: details.message,
        code: details.code,
        status: details.status,
      };
    }
    return { message: 'An unknown error occurred', code: 'UNKNOWN_ERROR', status: 500 };
  }
}

export const apiClient = new ApiClient();

// Convenience named exports used by older learning code.
export async function getProjects(orgIdOrSlug: string) {
  return apiClient.getProjects(orgIdOrSlug);
}

export async function createProject(orgIdOrSlug: string, data: any) {
  return apiClient.createProject(orgIdOrSlug, data);
}
