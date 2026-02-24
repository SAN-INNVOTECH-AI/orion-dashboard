import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  applyTheme: (theme: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      applyTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('light', theme === 'light')
        }
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('light', next === 'light')
        }
      },
    }),
    { name: 'orion-theme' }
  )
)
