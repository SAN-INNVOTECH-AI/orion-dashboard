'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import AgentStatusDot from '@/components/ui/AgentStatusDot'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Plus } from 'lucide-react'

interface Task {
  id: string; title: string; description: string; status: string; priority: string
  project_id: string; project_name?: string; assigned_agent?: string
  assigned_agent_name?: string; assigned_agent_status?: string; created_at: string
}
interface Project { id: string; name: string }
interface Agent { id: string; name: string; status: string; type: string }

const statusOpts = [
  { value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' }, { value: 'done', label: 'Done' },
]
const priorityOpts = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
]

export default function TasksPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', project_id: '', status: 'todo', priority: 'medium', assigned_agent: '' })

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  const load = async () => {
    setLoading(true)
    try {
      const [tr, pr, ar] = await Promise.all([api.get('/tasks'), api.get('/projects'), api.get('/agents')])
      setTasks(tr.data.data || tr.data)
      setProjects(pr.data.data || pr.data)
      setAgents(ar.data.data || ar.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditTask(null)
    setForm({ title: '', description: '', project_id: projects[0]?.id || '', status: 'todo', priority: 'medium', assigned_agent: '' })
    setShowModal(true)
  }

  const openEdit = (t: Task) => {
    setEditTask(t)
    setForm({ title: t.title, description: t.description, project_id: t.project_id, status: t.status, priority: t.priority, assigned_agent: t.assigned_agent || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.project_id) return
    setSaving(true)
    try {
      let taskId = editTask?.id
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, form)
      } else {
        const r = await api.post('/tasks', form)
        taskId = r.data.data?.id || r.data.id
      }
      if (form.assigned_agent && taskId) {
        await api.put(`/tasks/${taskId}/assign-agent`, { agent_id: form.assigned_agent })
      }
      setShowModal(false)
      load()
    } finally { setSaving(false) }
  }

  const projectOpts = projects.map((p) => ({ value: p.id, label: p.name }))
  const agentOpts = agents.map((a) => ({ value: a.id, label: `${a.name} (${a.type.replace(/_/g, ' ')})` }))

  return (
    <AppLayout title="Task Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-orion-muted text-sm">{tasks.length} tasks total</p>
        <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" /> Create Task</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orion-border">
                  {['Title', 'Project', 'Status', 'Priority', 'Assigned Agent', 'Created'].map((h) => (
                    <th key={h} className="text-left text-orion-muted font-medium pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-orion-border/50 hover:bg-orion-darker/30 transition-colors cursor-pointer"
                    onClick={() => openEdit(t)}
                  >
                    <td className="py-3 pr-4 text-orion-text font-medium max-w-48 truncate">{t.title}</td>
                    <td className="py-3 pr-4 text-orion-muted text-xs max-w-32 truncate">{t.project_name || t.project_id}</td>
                    <td className="py-3 pr-4"><Badge type="status" value={t.status} /></td>
                    <td className="py-3 pr-4"><Badge type="priority" value={t.priority} /></td>
                    <td className="py-3 pr-4">
                      {t.assigned_agent_name ? (
                        <div className="flex items-center gap-1.5">
                          <AgentStatusDot status={t.assigned_agent_status || 'idle'} />
                          <span className="text-orion-muted text-xs">{t.assigned_agent_name}</span>
                        </div>
                      ) : (
                        <span className="text-orion-muted text-xs italic">None</span>
                      )}
                    </td>
                    <td className="py-3 text-orion-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-orion-muted">No tasks yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTask ? 'Edit Task' : 'Create Task'} size="md">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="flex flex-col gap-1">
            <label className="text-orion-muted text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="bg-orion-card border border-orion-border rounded-lg px-3 py-2 text-orion-text w-full focus:outline-none focus:border-orion-accent resize-none"
            />
          </div>
          <Select label="Project" value={form.project_id} onChange={(v) => setForm({ ...form, project_id: v })} options={projectOpts} placeholder="Select project..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={statusOpts} />
            <Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={priorityOpts} />
          </div>
          <Select
            label="Assign to Agent (optional)"
            value={form.assigned_agent}
            onChange={(v) => setForm({ ...form, assigned_agent: v })}
            options={agentOpts}
            placeholder="— No Agent —"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{editTask ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
