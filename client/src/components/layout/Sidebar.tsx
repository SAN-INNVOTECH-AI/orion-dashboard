'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Columns, CheckSquare, Bot, BarChart2, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/kanban', label: 'Kanban', icon: Columns },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, adminOnly: true },
  { href: '/agents', label: 'Agents', icon: Bot, showAgentBadge: true },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { agents } = useDashboardStore()
  const workingCount = agents.filter((a) => a.status === 'working').length

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-orion-darker border-r border-orion-border flex flex-col z-40">
      <div className="p-6 border-b border-orion-border">
        <span className="text-orion-accent font-bold text-xl">⭐ Orion</span>
        <p className="text-orion-muted text-xs mt-1">SAN Innvotech AI</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, adminOnly, showAgentBadge }) => {
          if (adminOnly && user?.role !== 'admin') return null
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-orion-accent/10 text-orion-accent border-r-2 border-orion-accent'
                  : 'text-orion-muted hover:text-orion-text hover:bg-orion-card'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {showAgentBadge && workingCount > 0 && (
                <span className="bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {workingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-orion-border">
        <p className="text-orion-muted text-xs">v2.0.0 — Agent Fleet Active</p>
      </div>
    </div>
  )
}
