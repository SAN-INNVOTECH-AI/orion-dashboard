'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const t = localStorage.getItem('orion_token')
    if (t) router.push('/dashboard')
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-orion-darker px-4">
      <div className="bg-orion-card border border-orion-border rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⭐</span>
          <h1 className="text-orion-accent font-bold text-2xl mt-2">Orion</h1>
          <p className="text-orion-muted text-sm mt-1">SAN Innvotech AI Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && (
            <p className="text-orion-danger text-sm bg-orion-danger/10 border border-orion-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="text-orion-muted text-xs text-center mt-6">
          admin / admin · pm / manager123 · viewer / viewer123
        </p>
      </div>
    </div>
  )
}
