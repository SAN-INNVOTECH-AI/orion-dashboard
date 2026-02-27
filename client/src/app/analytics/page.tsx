'use client'
import { useEffect, useRef, useState } from 'react'
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
import { motion } from 'framer-motion'

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

const tooltipStyle = {
  background: 'rgba(10,10,15,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
}

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    if (!ref.current || animated.current) return
    animated.current = true
    const el = ref.current
    import('animejs').then(({ animate }) => {
      const obj = { val: 0 }
      animate(obj, {
        val: value,
        duration: 1200,
        easing: 'easeOutExpo',
        onUpdate: () => {
          el.textContent = prefix + Math.round(obj.val).toString() + suffix
        },
      })
    }).catch(() => {
      el.textContent = prefix + value.toString() + suffix
    })
  }, [value, prefix, suffix])

  return <span ref={ref}>{prefix}0{suffix}</span>
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/analytics')
      .then((r) => setAnalytics(r.data.data || r.data))
      .finally(() => setLoading(false))
  }, [])

  // GSAP scroll reveals
  useEffect(() => {
    if (!wrapRef.current || loading) return
    const cards = wrapRef.current.querySelectorAll('.gsap-reveal')
    if (cards.length === 0) return

    import('gsap').then(({ gsap }) => {
      cards.forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5, delay: i * 0.1, ease: 'power2.out' }
        )
      })
    }).catch(() => {})
  }, [loading, analytics])

  if (loading) return <AppLayout title="Analytics"><div className="flex justify-center py-12"><LoadingSpinner /></div></AppLayout>

  return (
    <AppLayout title="Analytics">
      {/* Summary counters */}
      {analytics?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Projects', value: analytics.summary.totalProjects || 0, color: 'text-blue-400', border: 'border-l-accent-blue' },
            { label: 'Total Tasks', value: analytics.summary.totalTasks || 0, color: 'text-yellow-400', border: 'border-l-accent-yellow' },
            { label: 'Total AI Cost', value: analytics.summary.totalCost || 0, color: 'text-green-400', prefix: '$', border: 'border-l-accent-green' },
          ].map(({ label, value, color, prefix, border }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <Card hoverable className={border}>
                <p className="text-orion-muted text-sm">{label}</p>
                <p className={`font-bold text-2xl mt-1 ${color}`}>
                  <AnimatedCounter value={typeof value === 'number' ? Math.round(value) : 0} prefix={prefix || ''} />
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div ref={wrapRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Status */}
        <div className="gsap-reveal">
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">Projects by Status</h2>
            {analytics?.projectsByStatus?.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.projectsByStatus.map(e => ({ ...e, label: STATUS_LABELS[e.status] || e.status }))}
                    dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80}
                    label={({ name }) => name}
                  >
                    {analytics.projectsByStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend formatter={(value) => STATUS_LABELS[value] || value} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-orion-muted text-sm">No data</p>}
          </Card>
        </div>

        {/* Tasks by Priority */}
        <div className="gsap-reveal">
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">Tasks by Priority</h2>
            {analytics?.tasksByPriority?.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.tasksByPriority.map(e => ({ ...e, label: PRIORITY_LABELS[e.priority] || e.priority }))}>
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.tasksByPriority.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-orion-muted text-sm">No data</p>}
          </Card>
        </div>

        {/* AI Cost Trend */}
        <div className="gsap-reveal">
          <Card>
            <h2 className="text-orion-text font-semibold mb-1">AI Cost Trend</h2>
            <p className="text-orion-muted text-xs mb-4">Total: ${analytics?.summary?.totalCost?.toFixed(4) || '0.0000'}</p>
            {analytics?.aiCostTrend?.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.aiCostTrend}>
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <defs>
                    <linearGradient id="analyticsCostGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00f5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cost" stroke="#00f5ff" fill="url(#analyticsCostGrad)" fillOpacity={1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-orion-muted text-sm">No AI usage data yet</p>}
          </Card>
        </div>

        {/* Agent Utilization */}
        <div className="gsap-reveal">
          <Card>
            <h2 className="text-orion-text font-semibold mb-4">Agent Utilization (Tasks Assigned)</h2>
            {analytics?.agentUtilization?.filter(a => a.assigned_tasks_count > 0).length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.agentUtilization.slice(0, 10)} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={130} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="assigned_tasks_count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-orion-muted text-sm">No assignment data yet</p>}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
