'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import AgentStatusDot from '@/components/ui/AgentStatusDot'
import { useDashboardStore } from '@/store/dashboardStore'
import api from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FolderOpen, CheckSquare, Bot, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

interface Analytics {
  projectsByStatus: { status: string; count: number }[]
  tasksByPriority: { priority: string; count: number }[]
  aiCostTrend: { date: string; cost: number }[]
  agentUtilization: { name: string; assigned_tasks_count: number }[]
  summary: { totalCost: number }
}

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
}

export default function DashboardPage() {
  const { projects, tasks, agents, fetchProjects, fetchTasks, fetchAgents } = useDashboardStore()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [liveAgents, setLiveAgents] = useState(agents)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    fetchAgents()
    api.get('/analytics').then((r) => setAnalytics(r.data.data || r.data)).catch(() => {})
  }, [fetchProjects, fetchTasks, fetchAgents])

  useEffect(() => { setLiveAgents(agents) }, [agents])

  useEffect(() => {
    const es = new EventSource(`${apiBase}/live-progress`)
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'agent_update') setLiveAgents(d.agents)
      } catch {}
    }
    return () => es.close()
  }, [apiBase])

  const openTasks     = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length
  const workingAgents = liveAgents.filter((a) => a.status === 'working').length
  const monthlyCost   = analytics?.summary?.totalCost?.toFixed(2) || '0.00'

  const stats = [
    { label: 'Total Projects',   value: projects.length, icon: FolderOpen,  color: 'text-blue-400',  bg: 'bg-blue-400/10' },
    { label: 'Open Tasks',       value: openTasks,       icon: CheckSquare, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Agents Working',   value: workingAgents,   icon: Bot,         color: 'text-orion-accent', bg: 'bg-orion-accent/10' },
    { label: 'Monthly AI Cost',  value: `$${monthlyCost}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
  ]

  return (
    <AppLayout title="Dashboard">
      {/* Stat Cards — staggered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card hoverable className="h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orion-muted text-sm">{label}</p>
                  <motion.p
                    className="text-orion-text font-bold text-2xl mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.08 + 0.2 }}
                  >
                    {value}
                  </motion.p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">AI Cost Trend</h2>
            {analytics?.aiCostTrend?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics.aiCostTrend}>
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--orion-tooltip-bg)', border: '1px solid var(--orion-tooltip-border)', borderRadius: 8, color: 'var(--orion-text)' }} />
                  <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-orion-muted text-sm">No cost data yet</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent Projects */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43, duration: 0.4 }}>
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">Recent Projects</h2>
            <div className="space-y-2">
              {projects.slice(0, 5).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="flex items-center justify-between py-2 border-b border-orion-border last:border-0"
                >
                  <span className="text-orion-text text-sm truncate flex-1 mr-2">{p.name}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge type="status" value={p.status} />
                    <Badge type="priority" value={p.priority} />
                  </div>
                </motion.div>
              ))}
              {projects.length === 0 && <p className="text-orion-muted text-sm">No projects yet</p>}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Live Agent Strip */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-orion-text font-semibold flex items-center gap-2">
              Live Agent Status
              <span className="flex items-center gap-1 text-xs text-green-400 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot inline-block" />
                live
              </span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-orion-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Working: {workingAgents}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Idle: {liveAgents.length - workingAgents}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {liveAgents.map((agent, i) => {
              const isWorking = agent.status === 'working'
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 + i * 0.02 }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 border transition-colors ${
                    isWorking
                      ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-300'
                      : 'bg-orion-darker border-orion-border text-orion-muted hover:border-orion-accent/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWorking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs truncate max-w-24">{agent.name.replace(' Agent', '')}</span>
                </motion.div>
              )
            })}
            {liveAgents.length === 0 && <p className="text-orion-muted text-sm">Loading agents...</p>}
          </div>
        </Card>
      </motion.div>
    </AppLayout>
  )
}
