'use client'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showValid?: boolean
  hint?: string
}

export default function Input({ label, error, showValid, hint, className, onChange, ...props }: InputProps) {
  const [touched, setTouched] = useState(false)
  const hasValue = String(props.value ?? '').length > 0
  const isValid = showValid && touched && hasValue && !error

  const borderClass = error
    ? 'border-orion-danger focus:border-orion-danger'
    : isValid
    ? 'border-green-500 focus:border-green-500'
    : 'border-white/10 focus:border-orion-accent'

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-orion-muted text-sm font-medium flex items-center gap-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          className={`glass border ${borderClass} rounded-lg px-3 py-2.5 text-orion-text w-full
            focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all duration-200 placeholder:text-orion-muted/50 text-sm
            ${isValid ? 'pr-9' : ''} ${className || ''}`}
          onBlur={() => setTouched(true)}
          onChange={(e) => { setTouched(true); onChange?.(e) }}
          {...props}
        />
        {isValid && (
          <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
        )}
      </div>

      {error && (
        <span className="text-orion-danger text-xs flex items-center gap-1 animate-slide-down">
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm.5 6.5h-1v-1h1v1zm0-2h-1V3.5h1V5.5z"/>
          </svg>
          {error}
        </span>
      )}
      {hint && !error && <span className="text-orion-muted text-xs">{hint}</span>}
    </div>
  )
}
