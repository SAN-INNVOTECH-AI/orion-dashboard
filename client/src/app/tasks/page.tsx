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
import { Plus, FolderOpen } from 'lucide-react'

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

interface FormErrors {
  title?: string
  project_id?: string
}

export default function TasksPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [form, setForm] = useState({
    title: '', description: '', project_id: '', status: 'todo', priority: 'medium', assigned_agent: ''
  })

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
    } finally {
      setLoading(false)
      setProjectsLoaded(true)
    }
  }

  useEffect(() => { load() }, [])

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.project_id) errs.project_id = 'Please select a project'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditTask(null)
    setErrors({})
    setForm({ title: '', description: '', project_id: projects[0]?.id || '', status: 'todo', priority: 'medium', assigned_agent: '' })
    setShowModal(true)
  }

  const openEdit = (t: Task) => {
    setEditTask(t)
    setErrors({})
    setForm({ title: t.title, description: t.description, project_id: t.project_id, status: t.status, priority: t.priority, assigned_agent: t.assigned_agent || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!validate()) return
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
  const agentOpts = agents.map((a) => ({ value: a.id, label: `${a.name}` }))

  // No projects empty state
  if (projectsLoaded && projects.length === 0) {
    return (
      <AppLayout title="Task Management">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-orion-accent/10 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-orion-accent" />
          </div>
          <h2 className="text-orion-text font-semibold text-xl mb-2">No projects yet</h2>
          <p className="text-orion-muted text-sm mb-6 max-w-xs">
            You need at least one project before creating tasks. Create your first project to get started.
          </p>
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-2 bg-orion-accent hover:bg-orion-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Project
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Task Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-orion-muted text-sm">{tasks.length} task{tasks.length !== 1 ? 's' : ''} total</p>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Create Task
        </Button>
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
                        <span className="text-orion-muted text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 text-orion-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-orion-muted">
                      No tasks yet — create your first task above
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTask ? 'Edit Task' : 'Create Task'}>
        <div className="space-y-4">
          {/* Title with validation */}
          <div>
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors({ ...errors, title: undefined }) }}
              placeholder="Enter task title"
            />
            {errors.title && <p className="text-orion-danger text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-orion-muted text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional description..."
              className="bg-orion-card border border-orion-border rounded-lg px-3 py-2 text-orion-text placeholder-orion-muted w-full focus:outline-none focus:border-orion-accent resize-none text-sm"
            />
          </div>

          {/* Project with validation */}
          <div>
            <Select
              label="Project *"
              value={form.project_id}
              onChange={(v) => { setForm({ ...form, project_id: v }); if (errors.project_id) setErrors({ ...errors, project_id: undefined }) }}
              options={projectOpts}
              placeholder="Select a project..."
            />
            {errors.project_id && <p className="text-orion-danger text-xs mt-1">{errors.project_id}</p>}
          </div>

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
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
