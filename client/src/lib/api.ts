import axios from 'axios'

function resolveApiBaseURL() {
  if (typeof window !== 'undefined') {
    return '/api'
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('orion_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('orion_token')
      localStorage.removeItem('orion_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
