import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export default function Card({ children, className, hoverable }: CardProps) {
  return (
    <div
      className={clsx(
        'glass-card p-4 transition-all duration-300',
        hoverable && 'hover:border-orion-accent/40 hover:shadow-lg hover:shadow-orion-accent/10 hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  )
}
