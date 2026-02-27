'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Columns, CheckSquare, Bot, BarChart2, Users, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/ingest',    label: 'New Project',  icon: Sparkles },
  { href: '/projects',  label: 'Projects',     icon: FolderOpen },
  { href: '/kanban',    label: 'Kanban',       icon: Columns },
  { href: '/tasks',     label: 'Tasks',        icon: CheckSquare, adminOnly: true },
  { href: '/agents',    label: 'Agents',       icon: Bot, showAgentBadge: true },
  { href: '/analytics', label: 'Analytics',    icon: BarChart2 },
  { href: '/users',     label: 'Users',        icon: Users, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { agents } = useDashboardStore()
  const workingCount = agents.filter((a) => a.status === 'working').length

  return (
    <div className="fixed left-0 top-0 h-screen w-64 glass-strong flex flex-col z-40 border-r border-white/10">
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
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
        {navItems.map(({ href, label, icon: Icon, adminOnly, showAgentBadge }, i) => {
          if (adminOnly && user?.role !== 'admin') return null
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: 'easeOut' }}
            >
              <Link
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-orion-accent/15 text-orion-accent border-r-2 border-orion-accent glow-accent'
                    : 'text-orion-muted hover:text-orion-text hover:bg-white/5 hover:translate-x-0.5'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {showAgentBadge && workingCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                  >
                    {workingCount}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-orion-muted text-xs">&copy; 2026 SAN Innvotech. All Rights Reserved.</p>
      </div>
    </div>
  )
}
