export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
}