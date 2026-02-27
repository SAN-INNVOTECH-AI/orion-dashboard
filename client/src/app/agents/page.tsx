'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import AgentStatusDot from '@/components/ui/AgentStatusDot'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import api from '@/lib/api'
import {
  Bot, Code2, Palette, Shield, Database, Smartphone, Zap,
  FlaskConical, Search, Scale, Rocket, BookOpen, Wrench, Video,
  BriefcaseBusiness, BarChart3, Settings
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Agent {
  id: string; name: string; type: string; description: string
  status: string; current_task_id?: string; current_task_title?: string; last_active: string
}
interface AgentTask {
  id: string; title: string; status: string; priority: string; project_name?: string
}

const typeIcons: Record<string, React.ElementType> = {
  project_manager: Bot, business_analyst: BriefcaseBusiness, system_integrator: Settings,
  uiux_designer: Palette, content_copywriter: BookOpen, security_specialist: Shield,
  db_admin: Database, web_developer: Code2, mobile_developer: Smartphone,
  performance_optimizer: Zap, qa_engineer: FlaskConical, seo_marketing: Search,
  compliance_legal: Scale, devops_engineer: Rocket, training_docs: BookOpen,
  maintenance_support: Wrench, video_generation: Video, default: BarChart3,
}

const statusBorderClass: Record<string, string> = {
  idle: 'border-t-2 border-t-green-500/40',
  working: 'border-t-2 border-t-[#00f5ff]/60 pulse-glow-cyan',
  completed: 'border-t-2 border-t-green-500/60 pulse-glow-green',
  error: 'border-t-2 border-t-red-500/60 pulse-glow-red',
}

function timeAgo(dateStr: string) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewAgent, setViewAgent] = useState<Agent | null>(null)
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [report, setReport] = useState<{ analyzed: number; issues_found: number; tasks_created: number; assignments: { task: string; agent: string }[] } | null>(null)
  const [showReport, setShowReport] = useState(false)

  const loadAgents = async () => {
    try {
      const r = await api.get('/agents')
      setAgents(r.data.data || r.data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    loadAgents()
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const es = new EventSource(`${apiBase}/live-progress`)
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.type === 'agent_update') setAgents(d.agents)
      } catch {}
    }
    return () => es.close()
  }, [])

  const openAgentTasks = async (agent: Agent) => {
    setViewAgent(agent)
    try {
      const r = await api.get(`/agents/${agent.id}`)
      setAgentTasks(r.data.data?.tasks || [])
    } catch { setAgentTasks([]) }
  }

  const runPMAgent = async () => {
    setIsRunning(true)
    try {
      const r = await api.post('/pm-agent/run')
      const data = r.data.data || r.data
      setReport(data)
      setShowReport(true)
      loadAgents()
    } catch {
      alert('PM Agent failed to run')
    } finally { setIsRunning(false) }
  }

  return (
    <AppLayout title="Agent Fleet">
      <div className="mb-6">
        <p className="text-orion-muted text-sm">{agents.length} Specialized AI Agents · SAN Innvotech</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, i) => {
            const Icon = typeIcons[agent.type] || typeIcons.default
            const isPM = agent.type === 'project_manager'
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="will-change-transform"
              >
                <Card
                  hoverable
                  className={`${isPM ? 'border-orion-accent/40 glow-accent' : ''} ${statusBorderClass[agent.status] || ''}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg backdrop-blur-sm ${isPM ? 'bg-orion-accent/20' : 'bg-white/5'}`}>
                      <Icon className={`w-5 h-5 ${isPM ? 'text-orion-accent' : 'text-orion-muted'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-orion-text font-semibold text-sm leading-tight">{agent.name}</p>
                      <p className="text-orion-muted text-xs mt-0.5 capitalize">{agent.type.replace(/_/g, ' ')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <AgentStatusDot status={agent.status} />
                    <Badge type="agent-status" value={agent.status} />
                  </div>

                  <p className="text-orion-muted text-xs italic mb-1 min-h-4 truncate">
                    {agent.current_task_title || 'Available'}
                  </p>
                  <p className="text-orion-muted text-xs mb-3">{timeAgo(agent.last_active)}</p>

                  <Button variant="ghost" size="sm" className="w-full" onClick={() => openAgentTasks(agent)}>
                    View Tasks
                  </Button>
                  {isPM && (
                    <Button variant="primary" size="sm" className="w-full mt-2" onClick={runPMAgent} loading={isRunning}>
                      {isRunning ? 'Running...' : 'Run PM Agent'}
                    </Button>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* View Tasks Modal */}
      <Modal isOpen={!!viewAgent} onClose={() => setViewAgent(null)} title={`${viewAgent?.name || ''} — Tasks`} size="md">
        {agentTasks.length === 0 ? (
          <p className="text-orion-muted text-sm">No tasks assigned to this agent.</p>
        ) : (
          <div className="space-y-2">
            {agentTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 glass rounded-lg">
                <div>
                  <p className="text-orion-text text-sm font-medium">{t.title}</p>
                  {t.project_name && <p className="text-orion-muted text-xs">{t.project_name}</p>}
                </div>
                <div className="flex gap-2">
                  <Badge type="status" value={t.status} />
                  <Badge type="priority" value={t.priority} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* PM Agent Report Modal */}
      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="PM Agent Report" size="lg">
        {report && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card rounded-xl p-4 text-center border-l-accent-blue">
                <p className="text-2xl font-bold text-orion-text">{report.analyzed}</p>
                <p className="text-orion-muted text-xs">Projects Analyzed</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center border-l-accent-yellow">
                <p className="text-2xl font-bold text-yellow-400">{report.issues_found}</p>
                <p className="text-orion-muted text-xs">Issues Found</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center border-l-accent-green">
                <p className="text-2xl font-bold text-green-400">{report.tasks_created}</p>
                <p className="text-orion-muted text-xs">Tasks Created</p>
              </div>
            </div>
            {report.assignments?.length > 0 && (
              <div>
                <h4 className="text-orion-text font-semibold mb-3">Agent Assignments</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {report.assignments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 glass rounded-lg text-sm glass-row">
                      <span className="text-orion-text flex-1 truncate">{a.task}</span>
                      <span className="text-orion-muted">&rarr;</span>
                      <span className="text-[#00f5ff] text-xs">{a.agent}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.issues_found === 0 && (
              <p className="text-green-400 text-sm mt-4">No issues found — all projects look healthy!</p>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
