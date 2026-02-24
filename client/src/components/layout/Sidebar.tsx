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
      <div className="p-5 border-b border-orion-border flex items-center gap-3">
        <svg width="30" height="30" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
          <circle cx="28" cy="28" r="24" stroke="#6366f1" strokeWidth="1.5" opacity="0.35" />
          <circle cx="28" cy="28" r="14" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />
          <circle cx="28" cy="28" r="4.5" fill="#6366f1" />
          <circle cx="28" cy="4"  r="3"   fill="#6366f1" />
          <circle cx="52" cy="28" r="2.5" fill="#6366f1" opacity="0.7" />
          <circle cx="28" cy="52" r="2"   fill="#6366f1" opacity="0.5" />
          <circle cx="4"  cy="28" r="2.5" fill="#6366f1" opacity="0.7" />
          <circle cx="44" cy="12" r="1.5" fill="#6366f1" opacity="0.4" />
          <circle cx="12" cy="44" r="1.5" fill="#6366f1" opacity="0.4" />
        </svg>
        <div>
          <p className="text-orion-accent font-bold text-base tracking-wide leading-none">ORION</p>
          <p className="text-orion-muted text-xs mt-0.5">SAN Innvotech AI</p>
        </div>
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
        <p className="text-orion-muted text-xs">© 2026 SAN Innvotech. All Rights Reserved.</p>
      </div>
    </div>
  )
}
