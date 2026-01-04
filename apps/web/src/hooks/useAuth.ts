import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { decodeToken, isTokenExpired } from '../utils/auth';

interface AuthState {
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LoginData {
  accessToken: string;
  refreshToken: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && !isTokenExpired(accessToken)) {
      const decoded = decodeToken(accessToken);
      setAuthState({
        userId: decoded.sub,
        isAuthenticated: true,
        isLoading: false,
      });
    } else if (refreshToken) {
      // Try to refresh
      refreshAccessToken();
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<LoginData>('/auth/login', { email, password });
      const { accessToken, refreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      const decoded = decodeToken(accessToken);
      setAuthState({
        userId: decoded.sub,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error };
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        // Ignore logout errors
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthState({
      userId: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.post<LoginData>('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      const decoded = decodeToken(accessToken);
      setAuthState({
        userId: decoded.sub,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // Refresh failed, logout
      logout();
    }
  }, [logout]);

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              await refreshAccessToken();
              // Retry the original request
              const config = error.config;
              config.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
              return api(config);
            } catch (refreshError) {
              // Refresh failed
              logout();
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken, logout]);

  return {
    ...authState,
    login,
    logout,
  };
};