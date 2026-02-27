'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { LogOut, Sun, Moon } from 'lucide-react'

interface HeaderProps { title: string }

type ProviderState = { claude: boolean; opengpt: boolean }

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme, applyTheme } = useThemeStore()
  const [providers, setProviders] = useState<ProviderState>({ claude: false, opengpt: false })

  useEffect(() => { applyTheme(theme) }, [theme, applyTheme])

  useEffect(() => {
    let alive = true

    const checkLlmProviders = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${base}/health/llm/providers`, { cache: 'no-store' })
        const data = await res.json()
        if (!alive) return
        setProviders({
          claude: !!data?.providers?.claude?.ok,
          opengpt: !!data?.providers?.opengpt?.ok,
        })
      } catch {
        if (!alive) return
        setProviders({ claude: false, opengpt: false })
      }
    }

    checkLlmProviders()
    const timer = setInterval(checkLlmProviders, 30000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const pillClass = (ok: boolean) => ok
    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/35 bg-red-500/10 text-red-300'

  return (
    <header className="h-16 glass-header flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300">
      <h1 className="text-orion-text font-semibold text-lg glow-text-accent">{title}</h1>
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-1 rounded-full glass text-xs font-medium border ${pillClass(providers.claude)}`}>
          Claude {providers.claude ? 'online' : 'offline'}
        </span>
        <span className={`px-2.5 py-1 rounded-full glass text-xs font-medium border ${pillClass(providers.opengpt)}`}>
          OpenGPT {providers.opengpt ? 'online' : 'offline'}
        </span>

        {user && (
          <>
            <span className="text-orion-muted text-sm">{user.name}</span>
            <Badge type="role" value={user.role} />
          </>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-orion-muted hover:text-orion-text glass border-transparent hover:border-white/10 transition-all"
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
