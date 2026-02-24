'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from './Sidebar'
import Header from './Header'

interface AppLayoutProps {
  title: string
  children: React.ReactNode
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const { token, user, init } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('orion_token')
      if (!t) {
        router.push('/login')
      }
    }
  }, [router])

  if (!token && typeof window !== 'undefined' && !localStorage.getItem('orion_token')) {
    return null
  }

  return (
    <div className="flex h-screen bg-orion-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6 bg-orion-dark">
          {children}
        </main>
      </div>
    </div>
  )
}
