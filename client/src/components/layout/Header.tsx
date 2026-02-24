'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { LogOut, Sun, Moon } from 'lucide-react'

interface HeaderProps { title: string }

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme, applyTheme } = useThemeStore()

  useEffect(() => { applyTheme(theme) }, [theme, applyTheme])

  return (
    <header className="h-16 border-b border-orion-border bg-orion-darker/80 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300">
      <h1 className="text-orion-text font-semibold text-lg">{title}</h1>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-orion-muted text-sm">{user.name}</span>
            <Badge type="role" value={user.role} />
          </>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-orion-muted hover:text-orion-text hover:bg-orion-card border border-transparent hover:border-orion-border transition-all"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
