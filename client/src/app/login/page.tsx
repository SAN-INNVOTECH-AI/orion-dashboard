'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Sun, Moon } from 'lucide-react'

function OrionLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="24" stroke="#00f5ff" strokeWidth="1.5" opacity="0.25" />
      <circle cx="28" cy="28" r="14" stroke="#6366f1" strokeWidth="1.5" opacity="0.5" />
      <circle cx="28" cy="28" r="4.5" fill="#6366f1" />
      <circle cx="28" cy="4"  r="3"   fill="#00f5ff" />
      <circle cx="52" cy="28" r="2.5" fill="#6366f1" opacity="0.7" />
      <circle cx="28" cy="52" r="2"   fill="#8b5cf6" opacity="0.5" />
      <circle cx="4"  cy="28" r="2.5" fill="#6366f1" opacity="0.7" />
      <circle cx="44" cy="12" r="1.5" fill="#00f5ff" opacity="0.4" />
      <circle cx="12" cy="44" r="1.5" fill="#8b5cf6" opacity="0.4" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuthStore()
  const { theme, toggleTheme, applyTheme } = useThemeStore()
  const router = useRouter()

  useEffect(() => {
    applyTheme(theme)
    if (localStorage.getItem('orion_token')) router.push('/orion')
  }, [router, theme, applyTheme])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/orion')
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient-bg px-4 relative overflow-hidden">
      {/* Bokeh background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bokeh-1"
          style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bokeh-2"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bokeh-1"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)', animationDelay: '3s' }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-lg text-orion-muted hover:text-orion-text glass border-white/10 transition-all z-20"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong rounded-2xl p-8 w-full max-w-sm relative z-10"
        style={{ boxShadow: '0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}
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
          <h1 className="text-[#00f5ff] font-bold text-2xl tracking-wide glow-text">ORION</h1>
          <p className="text-orion-muted text-xs mt-1 tracking-widest uppercase">SAN INNVOTECH</p>
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
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username"
              className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-orion-text placeholder-orion-muted focus:outline-none focus:border-[#00f5ff]/50 focus:shadow-[0_0_12px_rgba(0,245,255,0.1)] transition-all text-sm"
              autoFocus
            />
          </div>

          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full glass border border-white/10 rounded-xl pl-4 pr-10 py-3 text-orion-text placeholder-orion-muted focus:outline-none focus:border-[#00f5ff]/50 focus:shadow-[0_0_12px_rgba(0,245,255,0.1)] transition-all text-sm"
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
            className="w-full font-medium py-3 rounded-xl transition-all disabled:opacity-60 text-sm tracking-wide text-white"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
            }}
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
