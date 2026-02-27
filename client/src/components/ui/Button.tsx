'use client'
import { useRef } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  loading,
  children,
  className,
  type = 'button',
}: ButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    if (btnRef.current) {
      const btn = btnRef.current
      const ripple = document.createElement('span')
      ripple.className = 'absolute inset-0 rounded-lg pointer-events-none'
      ripple.style.background = 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)'
      ripple.style.opacity = '0'
      btn.appendChild(ripple)

      import('animejs').then(({ animate }) => {
        animate(ripple, {
          opacity: [0.6, 0],
          scale: [0.5, 2],
          duration: 500,
          ease: 'outQuad',
          onComplete: () => ripple.remove(),
        })
      }).catch(() => ripple.remove())
    }
    onClick?.()
  }

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={clsx(
        'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden',
        {
          'bg-orion-accent hover:bg-orion-accent-hover text-white hover:shadow-lg hover:shadow-orion-accent/20': variant === 'primary',
          'glass text-orion-text hover:border-orion-accent/40': variant === 'secondary',
          'bg-orion-danger hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/20': variant === 'danger',
          'text-orion-muted hover:text-orion-text hover:bg-white/5': variant === 'ghost',
          'px-2 py-1 text-xs': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
