import { clsx } from 'clsx'

interface BadgeProps {
  type?: 'status' | 'priority' | 'agent-status' | 'role'
  value: string
}

const statusColors: Record<string, string> = {
  planning: 'bg-gray-700 text-gray-200',
  in_progress: 'bg-blue-700 text-blue-100',
  review: 'bg-yellow-700 text-yellow-100',
  completed: 'bg-green-700 text-green-100',
  on_hold: 'bg-orange-700 text-orange-100',
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-700 text-gray-200',
  medium: 'bg-blue-700 text-blue-100',
  high: 'bg-orange-700 text-orange-100',
  urgent: 'bg-red-700 text-red-100',
}

const agentStatusColors: Record<string, string> = {
  idle: 'bg-gray-700 text-gray-200',
  working: 'bg-yellow-700 text-yellow-100',
  completed: 'bg-green-700 text-green-100',
  error: 'bg-red-700 text-red-100',
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-700 text-purple-100',
  project_manager: 'bg-blue-700 text-blue-100',
  viewer: 'bg-gray-700 text-gray-200',
}

const taskStatusColors: Record<string, string> = {
  todo: 'bg-gray-700 text-gray-200',
  in_progress: 'bg-blue-700 text-blue-100',
  review: 'bg-yellow-700 text-yellow-100',
  done: 'bg-green-700 text-green-100',
}

export default function Badge({ type = 'status', value }: BadgeProps) {
  let colorClass = 'bg-gray-700 text-gray-200'

  if (type === 'status') {
    colorClass = statusColors[value] || taskStatusColors[value] || 'bg-gray-700 text-gray-200'
  } else if (type === 'priority') {
    colorClass = priorityColors[value] || 'bg-gray-700 text-gray-200'
  } else if (type === 'agent-status') {
    colorClass = agentStatusColors[value] || 'bg-gray-700 text-gray-200'
  } else if (type === 'role') {
    colorClass = roleColors[value] || 'bg-gray-700 text-gray-200'
  }

  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full capitalize font-medium', colorClass)}>
      {value?.replace(/_/g, ' ')}
    </span>
  )
}
