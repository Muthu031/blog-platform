import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { decodeToken, isTokenExpired } from '../utils/auth';
import { AuthState } from '../types';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: any }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      if (response.data.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        const decoded = decodeToken(accessToken);
        setAuthState({ userId: decoded.sub, isAuthenticated: true, isLoading: false });
      } else {
        // Refresh failed
        await logout();
      }
    } catch (error) {
      await logout();
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const { accessToken, refreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        const decoded = decodeToken(accessToken);
        setAuthState({ userId: decoded.sub, isAuthenticated: true, isLoading: false });
        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: response.data.error };
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.response?.data?.error || error };
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        // ignore
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    setAuthState({ userId: null, isAuthenticated: false, isLoading: false });
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && !isTokenExpired(accessToken)) {
      const decoded = decodeToken(accessToken);
      setAuthState({ userId: decoded.sub, isAuthenticated: true, isLoading: false });
    } else if (refreshToken) {
      // try refresh
      refreshAccessToken();
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [refreshAccessToken]);

  // axios interceptor
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              await refreshAccessToken();
              const config = error.config;
              config.headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
              return api(config);
            } catch (refreshError) {
              await logout();
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

  const value: AuthContextValue = {
    ...authState,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthContextConsumer = AuthContext;
export default AuthContext;