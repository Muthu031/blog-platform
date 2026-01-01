import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE,
})

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api