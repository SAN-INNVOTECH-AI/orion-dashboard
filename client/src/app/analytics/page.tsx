'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import api from '@/lib/api'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis,
  AreaChart, Area,
  ResponsiveContainer
} from 'recharts'

interface Analytics {
  projectsByStatus: { status: string; count: number }[]
  tasksByPriority: { priority: string; count: number }[]
  aiCostTrend: { date: string; cost: number }[]
  agentUtilization: { name: string; assigned_tasks_count: number }[]
  summary: { totalCost: number; totalProjects: number; totalTasks: number }
}

const STATUS_LABELS: Record<string, string> = {
  planning:    'Planning',
  in_progress: 'In Progress',
  review:      'Review',
  completed:   'Completed',
  on_hold:     'On Hold',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}
const STATUS_COLORS: Record<string, string> = {
  planning: '#6b7280', in_progress: '#3b82f6', review: '#f59e0b',
  completed: '#10b981', on_hold: '#f97316',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444',
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics')
      .then((r) => setAnalytics(r.data.data || r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <AppLayout title="Analytics"><div className="flex justify-center py-12"><LoadingSpinner /></div></AppLayout>

  return (
    <AppLayout title="Analytics">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Status */}
        <Card>
          <h2 className="text-orion-text font-semibold mb-4">Projects by Status</h2>
          {analytics?.projectsByStatus?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.projectsByStatus.map(e => ({ ...e, label: STATUS_LABELS[e.status] || e.status }))}
                  dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80}
                  label={({ label }) => label}
                >
                  {analytics.projectsByStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ background: 'var(--orion-tooltip-bg)', border: '1px solid var(--orion-tooltip-border)', borderRadius: 8, color: 'var(--orion-text)' }}
                />
                <Legend formatter={(value) => STATUS_LABELS[value] || value} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-orion-muted text-sm">No data</p>}
        </Card>

        {/* Tasks by Priority */}
        <Card>
          <h2 className="text-orion-text font-semibold mb-4">Tasks by Priority</h2>
          {analytics?.tasksByPriority?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.tasksByPriority.map(e => ({ ...e, label: PRIORITY_LABELS[e.priority] || e.priority }))}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--orion-tooltip-bg)', border: '1px solid var(--orion-tooltip-border)', borderRadius: 8, color: 'var(--orion-text)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analytics.tasksByPriority.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-orion-muted text-sm">No data</p>}
        </Card>

        {/* AI Cost Trend */}
        <Card>
          <h2 className="text-orion-text font-semibold mb-4">AI Cost Trend — Total: ${analytics?.summary?.totalCost?.toFixed(4) || '0.0000'}</h2>
          {analytics?.aiCostTrend?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.aiCostTrend}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--orion-tooltip-bg)', border: '1px solid var(--orion-tooltip-border)', borderRadius: 8, color: 'var(--orion-text)' }} />
                <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-orion-muted text-sm">No AI usage data yet</p>}
        </Card>

        {/* Agent Utilization */}
        <Card>
          <h2 className="text-orion-text font-semibold mb-4">Agent Utilization (Tasks Assigned)</h2>
          {analytics?.agentUtilization?.filter(a => a.assigned_tasks_count > 0).length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.agentUtilization.slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} />
                <Tooltip contentStyle={{ background: 'var(--orion-tooltip-bg)', border: '1px solid var(--orion-tooltip-border)', borderRadius: 8, color: 'var(--orion-text)' }} />
                <Bar dataKey="assigned_tasks_count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-orion-muted text-sm">No assignment data yet</p>}
        </Card>
      </div>
    </AppLayout>
  )
}
