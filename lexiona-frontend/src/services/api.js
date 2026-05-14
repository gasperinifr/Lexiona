import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lexiona_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: tratar erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('lexiona_token')
      localStorage.removeItem('lexiona_professor')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
