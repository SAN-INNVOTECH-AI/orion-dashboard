import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('bg-orion-card border border-orion-border rounded-xl p-4', className)}>
      {children}
    </div>
  )
}
