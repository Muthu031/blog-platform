import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiError } from '@types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async signup(email: string, password: string, name: string) {
    const response = await this.client.post('/auth/signup', { email, password, name });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Organization endpoints
  async getOrganizations() {
    const response = await this.client.get('/organizations');
    return response.data;
  }

  async getOrganization(slug: string) {
    const response = await this.client.get(`/organizations/${slug}`);
    return response.data;
  }

  async createOrganization(data: any) {
    const response = await this.client.post('/organizations', data);
    return response.data;
  }

  async updateOrganization(slug: string, data: any) {
    const response = await this.client.patch(`/organizations/${slug}`, data);
    return response.data;
  }

  async getOrganizationMembers(organizationId: string) {
    const response = await this.client.get(`/organizations/${organizationId}/members`);
    return response.data;
  }

  async inviteOrganizationMembers(organizationId: string, data: any) {
    const response = await this.client.post(`/organizations/${organizationId}/invites`, data);
    return response.data;
  }

  // Project endpoints
  async getProjects(organizationId: string) {
    const response = await this.client.get(`/organizations/${organizationId}/projects`);
    return response.data;
  }

  async getProject(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(organizationId: string, data: any) {
    const response = await this.client.post(`/organizations/${organizationId}/projects`, data);
    return response.data;
  }

  async updateProject(projectId: string, data: any) {
    const response = await this.client.patch(`/projects/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: string) {
    const response = await this.client.delete(`/projects/${projectId}`);
    return response.data;
  }

  async getProjectMembers(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/members`);
    return response.data;
  }

  // Board endpoints
  async getBoards(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/boards`);
    return response.data;
  }

  async getBoard(boardId: string) {
    const response = await this.client.get(`/boards/${boardId}`);
    return response.data;
  }

  async createBoard(projectId: string, data: any) {
    const response = await this.client.post(`/projects/${projectId}/boards`, data);
    return response.data;
  }

  async getBoardColumns(boardId: string) {
    const response = await this.client.get(`/boards/${boardId}/columns`);
    return response.data;
  }

  async createBoardColumn(boardId: string, data: any) {
    const response = await this.client.post(`/boards/${boardId}/columns`, data);
    return response.data;
  }

  async updateBoardColumn(columnId: string, data: any) {
    const response = await this.client.patch(`/columns/${columnId}`, data);
    return response.data;
  }

  // Task endpoints
  async getTasks(boardId: string, params?: any) {
    const response = await this.client.get(`/boards/${boardId}/tasks`, { params });
    return response.data;
  }

  async getTask(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(columnId: string, data: any) {
    const response = await this.client.post(`/columns/${columnId}/tasks`, data);
    return response.data;
  }

  async updateTask(taskId: string, data: any) {
    const response = await this.client.patch(`/tasks/${taskId}`, data);
    return response.data;
  }

  async moveTask(taskId: string, columnId: string, position: number) {
    const response = await this.client.patch(`/tasks/${taskId}`, { columnId, position });
    return response.data;
  }

  async deleteTask(taskId: string) {
    const response = await this.client.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // Task Comment endpoints
  async getTaskComments(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}/comments`);
    return response.data;
  }

  async createTaskComment(taskId: string, data: any) {
    const response = await this.client.post(`/tasks/${taskId}/comments`, data);
    return response.data;
  }

  async deleteTaskComment(commentId: string) {
    const response = await this.client.delete(`/comments/${commentId}`);
    return response.data;
  }

  // Task Activity endpoints
  async getTaskActivity(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}/activity`);
    return response.data;
  }

  // Labels endpoints
  async getProjectLabels(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/labels`);
    return response.data;
  }

  async createProjectLabel(projectId: string, data: any) {
    const response = await this.client.post(`/projects/${projectId}/labels`, data);
    return response.data;
  }

  async deleteLabel(labelId: string) {
    const response = await this.client.delete(`/labels/${labelId}`);
    return response.data;
  }

  // Error handler
  static handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      return {
        message: error.response?.data?.message || error.message,
        code: error.code || 'UNKNOWN_ERROR',
        status: error.response?.status || 500,
        errors: error.response?.data?.errors,
      };
    }
    return {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      status: 500,
    };
  }
}

export const apiClient = new ApiClient();

// Convenience named exports for common functions used across the app
export async function getProjects(organizationId: string) {
  return apiClient.getProjects(organizationId);
}

export async function createProject(organizationId: string, data: any) {
  return apiClient.createProject(organizationId, data);
}

export async function getProject(projectId: string) {
  return apiClient.getProject(projectId);
}

export async function createTask(columnId: string, data: any) {
  return apiClient.createTask(columnId, data);
}
