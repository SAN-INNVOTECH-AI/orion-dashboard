import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  init: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  init: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('orion_token')
      const userStr = localStorage.getItem('orion_user')
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr)
          set({ token, user })
        } catch {
          localStorage.removeItem('orion_token')
          localStorage.removeItem('orion_user')
        }
      }
    }
  },

  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user } = res.data
    if (typeof window !== 'undefined') {
      localStorage.setItem('orion_token', token)
      localStorage.setItem('orion_user', JSON.stringify(user))
    }
    set({ token, user })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orion_token')
      localStorage.removeItem('orion_user')
      window.location.href = '/login'
    }
    set({ token: null, user: null })
  },
}))
