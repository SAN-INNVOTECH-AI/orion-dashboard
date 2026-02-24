'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AgentStatusDot from '@/components/ui/AgentStatusDot'
import { useDashboardStore } from '@/store/dashboardStore'
import api from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FolderOpen, CheckSquare, Bot, DollarSign } from 'lucide-react'

interface Analytics {
  projectsByStatus: { status: string; count: number }[]
  tasksByPriority: { priority: string; count: number }[]
  aiCostTrend: { date: string; cost: number }[]
  agentUtilization: { name: string; assigned_tasks_count: number }[]
  summary: { totalCost: number }
}

export default function DashboardPage() {
  const { projects, tasks, agents, fetchProjects, fetchTasks, fetchAgents, loading } = useDashboardStore()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [liveAgents, setLiveAgents] = useState(agents)

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    fetchAgents()
    api.get('/analytics').then((r) => setAnalytics(r.data.data || r.data)).catch(() => {})
  }, [fetchProjects, fetchTasks, fetchAgents])

  useEffect(() => {
    setLiveAgents(agents)
  }, [agents])

  useEffect(() => {
    const es = new EventSource('http://localhost:5000/live-progress')
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'agent_update') setLiveAgents(d.agents)
      } catch {}
    }
    return () => es.close()
  }, [])

  const openTasks = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length
  const workingAgents = liveAgents.filter((a) => a.status === 'working').length
  const monthlyCost = analytics?.summary?.totalCost?.toFixed(2) || '0.00'

  const stats = [
    { label: 'Total Projects', value: projects.length, icon: FolderOpen, color: 'text-blue-400' },
    { label: 'Open Tasks', value: openTasks, icon: CheckSquare, color: 'text-yellow-400' },
    { label: 'Agents Working', value: workingAgents, icon: Bot, color: 'text-orion-accent' },
    { label: 'Monthly AI Cost', value: `$${monthlyCost}`, icon: DollarSign, color: 'text-green-400' },
  ]

  return (
    <AppLayout title="Dashboard">
      {loading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orion-muted text-sm">{label}</p>
                <p className="text-orion-text font-bold text-2xl mt-1">{value}</p>
              </div>
              <Icon className={`w-8 h-8 ${color}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost Trend */}
        <Card>
          <h2 className="text-orion-text font-semibold mb-4">AI Cost Trend</h2>
          {analytics?.aiCostTrend?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics.aiCostTrend}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8 }} />
                <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-orion-muted text-sm">No cost data yet</p>
          )}
        </Card>

        {/* Recent Projects */}
        <Card>
          <h2 className="text-orion-text font-semibold mb-4">Recent Projects</h2>
          <div className="space-y-2">
            {projects.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-orion-border last:border-0">
                <span className="text-orion-text text-sm truncate flex-1 mr-2">{p.name}</span>
                <div className="flex gap-2 flex-shrink-0">
                  <Badge type="status" value={p.status} />
                  <Badge type="priority" value={p.priority} />
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-orion-muted text-sm">No projects yet</p>}
          </div>
        </Card>
      </div>

      {/* Live Agent Strip */}
      <Card>
        <h2 className="text-orion-text font-semibold mb-3">
          Live Agent Status
          <span className="ml-2 text-xs text-orion-muted font-normal">● live</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {liveAgents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-1.5 bg-orion-darker border border-orion-border rounded-full px-3 py-1"
            >
              <AgentStatusDot status={agent.status} />
              <span className="text-orion-muted text-xs truncate max-w-24">{agent.name.replace(' Agent', '')}</span>
            </div>
          ))}
          {liveAgents.length === 0 && <p className="text-orion-muted text-sm">Loading agents...</p>}
        </div>
      </Card>
    </AppLayout>
  )
}
