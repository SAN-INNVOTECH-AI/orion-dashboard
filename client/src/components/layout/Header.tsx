'use client'
import { useAuthStore } from '@/store/authStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()

  return (
    <header className="h-16 border-b border-orion-border bg-orion-darker/50 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-orion-text font-semibold text-lg">{title}</h1>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-orion-muted text-sm">{user.name}</span>
            <Badge type="role" value={user.role} />
          </>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
