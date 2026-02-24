'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react'

function OrionLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="24" stroke="#6366f1" strokeWidth="1.5" opacity="0.35" />
      <circle cx="28" cy="28" r="14" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />
      <circle cx="28" cy="28" r="4.5" fill="#6366f1" />
      {/* Orbital dots */}
      <circle cx="28" cy="4"  r="3"   fill="#6366f1" />
      <circle cx="52" cy="28" r="2.5" fill="#6366f1" opacity="0.7" />
      <circle cx="28" cy="52" r="2"   fill="#6366f1" opacity="0.5" />
      <circle cx="4"  cy="28" r="2.5" fill="#6366f1" opacity="0.7" />
      {/* Diagonal accent dots */}
      <circle cx="44" cy="12" r="1.5" fill="#6366f1" opacity="0.4" />
      <circle cx="12" cy="44" r="1.5" fill="#6366f1" opacity="0.4" />
    </svg>
  )
}

export default function LoginPage() {
  const [code, setCode]         = useState('')
  const [show, setShow]         = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login, token }        = useAuthStore()
  const { theme, toggleTheme, applyTheme } = useThemeStore()
  const router = useRouter()

  useEffect(() => {
    applyTheme(theme)
    if (localStorage.getItem('orion_token')) router.push('/dashboard')
  }, [router, theme, applyTheme])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setLoading(true)
    try {
      await login('admin', code)
      router.push('/dashboard')
    } catch {
      setError('Invalid access code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-orion-darker px-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)' }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-lg text-orion-muted hover:text-orion-text hover:bg-orion-card border border-orion-border transition-all"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-orion-card border border-orion-border rounded-2xl p-8 w-full max-w-sm shadow-2xl relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
        >
          <div className="flex justify-center mb-3">
            <OrionLogo size={56} />
          </div>
          <h1 className="text-orion-accent font-bold text-2xl tracking-wide">ORION</h1>
          <p className="text-orion-muted text-xs mt-1 tracking-widest uppercase">SAN Innvotech AI</p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orion-muted" />
            <input
              type={show ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              className="w-full bg-orion-darker border border-orion-border rounded-xl pl-10 pr-10 py-3 text-orion-text placeholder-orion-muted focus:outline-none focus:border-orion-accent transition-colors text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-orion-muted hover:text-orion-text transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-orion-danger text-xs bg-orion-danger/10 border border-orion-danger/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-orion-accent hover:bg-orion-accent-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60 text-sm tracking-wide"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Authenticating…
              </span>
            ) : 'Enter Dashboard'}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  )
}
