'use client'
import { useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
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
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }),
}

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    if (!ref.current || animated.current || value === 0) return
    animated.current = true
    const el = ref.current
    import('animejs').then(({ animate }) => {
      const obj = { val: 0 }
      animate(obj, {
        val: value,
        duration: 1500,
        easing: 'easeOutExpo',
        onUpdate: () => {
          el.textContent = prefix + Math.round(obj.val).toString()
        },
      })
    }).catch(() => {
      el.textContent = prefix + value.toString()
    })
  }, [value, prefix])

  return <span ref={ref}>{prefix}0</span>
}

const tooltipStyle = {
  background: 'rgba(10,10,15,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
  backdropFilter: 'blur(12px)',
}

export default function DashboardPage() {
  const { projects, tasks, agents, fetchProjects, fetchTasks, fetchAgents } = useDashboardStore()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [liveAgents, setLiveAgents] = useState(agents)
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const sectionsRef = useRef<HTMLDivElement>(null)

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

  // GSAP scroll reveals
  useEffect(() => {
    if (!sectionsRef.current) return
    const sections = sectionsRef.current.querySelectorAll('.gsap-reveal')
    if (sections.length === 0) return

    import('gsap').then(({ gsap }) => {
      sections.forEach((section) => {
        gsap.fromTo(section,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 90%',
              once: true,
            },
          }
        )
      })
    }).catch(() => {})
  }, [analytics])

  const openTasks     = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length
  const workingAgents = liveAgents.filter((a) => a.status === 'working').length
  const monthlyCost   = analytics?.summary?.totalCost?.toFixed(2) || '0.00'

  const stats = [
    { label: 'Total Projects',  value: projects.length, icon: FolderOpen,  color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-l-accent-blue',   glow: 'glow-blue' },
    { label: 'Open Tasks',      value: openTasks,       icon: CheckSquare, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-l-accent-yellow', glow: 'glow-yellow' },
    { label: 'Agents Working',  value: workingAgents,   icon: Bot,         color: 'text-[#00f5ff]',  bg: 'bg-[#00f5ff]/10',  border: 'border-l-accent-cyan',   glow: 'glow-cyan' },
    { label: 'Monthly AI Cost', value: monthlyCost, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-l-accent-green', glow: 'glow-green', prefix: '$', isString: true },
  ]

  return (
    <AppLayout title="Dashboard">
      <div ref={sectionsRef}>
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(({ label, value, icon: Icon, color, bg, border, glow, prefix, isString }, i) => (
            <motion.div key={label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
              <Card hoverable className={`h-full ${border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orion-muted text-sm">{label}</p>
                    <p className={`font-bold text-2xl mt-1 ${color}`}>
                      {isString ? (
                        `$${value}`
                      ) : (
                        <AnimatedCounter value={value as number} prefix={prefix || ''} />
                      )}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center backdrop-blur-sm ${glow}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 gsap-reveal">
          {/* Cost Trend */}
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">AI Cost Trend</h2>
            {analytics?.aiCostTrend?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics.aiCostTrend}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00f5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="cost" stroke="#00f5ff" fill="url(#costGrad)" fillOpacity={1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-orion-muted text-sm">No cost data yet</p>
              </div>
            )}
          </Card>

          {/* Recent Projects */}
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">Recent Projects</h2>
            <div className="space-y-2">
              {projects.slice(0, 5).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg glass-row border-b border-white/5 last:border-0"
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
        </div>

        {/* Live Agent Strip */}
        <div className="gsap-reveal">
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
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00f5ff] inline-block" /> Working: {workingAgents}</span>
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
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 border backdrop-blur-sm transition-all duration-200 ${
                      isWorking
                        ? 'bg-[#00f5ff]/10 border-[#00f5ff]/40 text-[#00f5ff] pulse-glow-cyan'
                        : 'bg-white/5 border-white/10 text-orion-muted hover:border-[#00f5ff]/30'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWorking ? 'bg-[#00f5ff] animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-xs truncate max-w-24">{agent.name.replace(' Agent', '')}</span>
                  </motion.div>
                )
              })}
              {liveAgents.length === 0 && <p className="text-orion-muted text-sm">Loading agents...</p>}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
