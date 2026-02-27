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
        const base = '/api'
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
    ? 'border-emerald-300/80 bg-emerald-400 text-black shadow-[0_0_18px_rgba(16,185,129,0.75)]'
    : 'border-red-300/80 bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.9)]'

  return (
    <header className="h-16 glass-header flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300">
      <h1 className="text-orion-text font-semibold text-lg glow-text-accent">{title}</h1>
      <div className="flex items-center gap-3">
        <span className={`min-w-[84px] px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center ${pillClass(providers.claude)}`}>
          Claude
        </span>
        <span className={`min-w-[84px] px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center justify-center ${pillClass(true)}`}>
          OpenGPT
        </span>

        {user && (
          <>
            <span className="text-orion-muted text-sm">{user.name}</span>
            <Badge type="role" value={user.role} />
          </>
        )}
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-lg text-orion-text glass border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-xs font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
