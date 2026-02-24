import { clsx } from 'clsx'

interface AgentStatusDotProps {
  status: string
  size?: 'sm' | 'md'
}

export default function AgentStatusDot({ status, size = 'sm' }: AgentStatusDotProps) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full',
        size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
        {
          'bg-gray-400': status === 'idle',
          'bg-yellow-400 animate-pulse': status === 'working',
          'bg-green-400': status === 'completed',
          'bg-red-400': status === 'error',
        }
      )}
    />
  )
}
