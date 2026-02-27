import { clsx } from 'clsx'

interface BadgeProps {
  type?: 'status' | 'priority' | 'agent-status' | 'role'
  value: string
}

const statusColors: Record<string, string> = {
  planning: 'bg-gray-500/20 text-gray-200 border-gray-500/30',
  in_progress: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  review: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-200 border-green-500/30',
  on_hold: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-200 border-gray-500/30',
  medium: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-200 border-red-500/30',
}

const agentStatusColors: Record<string, string> = {
  idle: 'bg-gray-500/20 text-gray-200 border-gray-500/30',
  working: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-200 border-green-500/30',
  error: 'bg-red-500/20 text-red-200 border-red-500/30',
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
  project_manager: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  viewer: 'bg-gray-500/20 text-gray-200 border-gray-500/30',
}

const taskStatusColors: Record<string, string> = {
  todo: 'bg-gray-500/20 text-gray-200 border-gray-500/30',
  in_progress: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  review: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  done: 'bg-green-500/20 text-green-200 border-green-500/30',
}

const defaultColor = 'bg-gray-500/20 text-gray-200 border-gray-500/30'

export default function Badge({ type = 'status', value }: BadgeProps) {
  let colorClass = defaultColor

  if (type === 'status') {
    colorClass = statusColors[value] || taskStatusColors[value] || defaultColor
  } else if (type === 'priority') {
    colorClass = priorityColors[value] || defaultColor
  } else if (type === 'agent-status') {
    colorClass = agentStatusColors[value] || defaultColor
  } else if (type === 'role') {
    colorClass = roleColors[value] || defaultColor
  }

  return (
    <span className={clsx(
      'text-xs px-2 py-0.5 rounded-full capitalize font-medium border backdrop-blur-sm',
      colorClass
    )}>
      {value?.replace(/_/g, ' ')}
    </span>
  )
}
