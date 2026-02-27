'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import Sidebar from './Sidebar'
import Header from './Header'
import dynamic from 'next/dynamic'

const SmoothScroll = dynamic(() => import('@/components/scroll/SmoothScroll'), { ssr: false })

interface AppLayoutProps {
  title: string
  children: React.ReactNode
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const { token, init } = useAuthStore()
  const { theme, applyTheme } = useThemeStore()
  const router = useRouter()

  useEffect(() => { init() }, [init])
  useEffect(() => { applyTheme(theme) }, [theme, applyTheme])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('orion_token')) {
      router.push('/login')
    }
  }, [router])

  if (!token && typeof window !== 'undefined' && !localStorage.getItem('orion_token')) {
    return null
  }

  return (
    <div className="flex h-screen animated-gradient-bg overflow-hidden transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6 transition-colors duration-300">
          <SmoothScroll>
            <div className="page-enter">
              {children}
            </div>
          </SmoothScroll>
        </main>
      </div>
    </div>
  )
}
