'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import AgentStatusDot from '@/components/ui/AgentStatusDot'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import api from '@/lib/api'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, FolderOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface Task {
  id: string; title: string; description: string; status: string; priority: string
  assigned_agent?: string; assigned_agent_name?: string; assigned_agent_status?: string
  project_id: string; notes?: string; phase?: number
}
interface Project { id: string; name: string }
interface Agent { id: string; name: string; status: string }

const columns = [
  { id: 'todo', label: 'To Do', accent: 'border-t-2 border-t-gray-500/50' },
  { id: 'in_progress', label: 'In Progress', accent: 'border-t-2 border-t-[#00f5ff]/50' },
  { id: 'review', label: 'Review', accent: 'border-t-2 border-t-yellow-500/50' },
  { id: 'done', label: 'Done', accent: 'border-t-2 border-t-green-500/50' },
]
const priorityBorderClass: Record<string, string> = {
  low: 'border-l-2 border-l-gray-500/40',
  medium: 'border-l-2 border-l-blue-500/40',
  high: 'border-l-2 border-l-orange-500/50',
  urgent: 'border-l-2 border-l-red-500/60',
}
const priorityOptions = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
]

export default function KanbanPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [, setDefaultStatus] = useState('todo')
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assigned_agent: '', status: 'todo' })
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState('')

  useEffect(() => {
    api.get('/projects').then((r) => {
      const ps = r.data.data || r.data
      setProjects(ps)
      if (ps.length) setSelectedProject(ps[0].id)
    }).finally(() => setProjectsLoaded(true))
    api.get('/agents').then((r) => setAgents(r.data.data || r.data))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    setLoading(true)
    api.get(`/tasks?project_id=${selectedProject}`)
      .then((r) => setTasks(r.data.data || r.data))
      .finally(() => setLoading(false))
  }, [selectedProject])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    if (result.source.droppableId === destination.droppableId) return
    const newStatus = destination.droppableId
    setTasks((prev) => prev.map((t) => t.id === draggableId ? { ...t, status: newStatus } : t))
    try {
      await api.put(`/tasks/${draggableId}/move`, { status: newStatus })
    } catch {
      setTasks((prev) => prev.map((t) => t.id === draggableId ? { ...t, status: result.source.droppableId } : t))
    }
  }

  const openCreate = (status: string) => {
    setEditTask(null)
    setTitleError('')
    setDefaultStatus(status)
    setForm({ title: '', description: '', priority: 'medium', assigned_agent: '', status })
    setShowModal(true)
  }

  const openEdit = (task: Task) => {
    setEditTask(task)
    setTitleError('')
    setForm({ title: task.title, description: task.description, priority: task.priority, assigned_agent: task.assigned_agent || '', status: task.status })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setTitleError('Title is required'); return }
    setSaving(true)
    try {
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, { ...form, project_id: selectedProject })
        if (form.assigned_agent) await api.put(`/tasks/${editTask.id}/assign-agent`, { agent_id: form.assigned_agent })
      } else {
        const r = await api.post('/tasks', { ...form, project_id: selectedProject })
        const newTaskId = r.data.data?.id || r.data.id
        if (form.assigned_agent && newTaskId) await api.put(`/tasks/${newTaskId}/assign-agent`, { agent_id: form.assigned_agent })
      }
      setShowModal(false)
      if (selectedProject) {
        const r = await api.get(`/tasks?project_id=${selectedProject}`)
        setTasks(r.data.data || r.data)
      }
    } finally { setSaving(false) }
  }

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }))

  return (
    <AppLayout title="Kanban Board">
      {/* No projects empty state */}
      {projectsLoaded && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-orion-accent/10 flex items-center justify-center mb-4 backdrop-blur-sm">
            <FolderOpen className="w-8 h-8 text-orion-accent" />
          </div>
          <h2 className="text-orion-text font-semibold text-xl mb-2">No projects yet</h2>
          <p className="text-orion-muted text-sm mb-6 max-w-xs">
            Create your first project to start organizing tasks on the Kanban board.
          </p>
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-2 bg-orion-accent hover:bg-orion-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Project
          </button>
        </motion.div>
      )}

      {/* Project selector + board */}
      {projects.length > 0 && (
      <>
      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="glass border border-white/10 rounded-lg px-3 py-2 text-orion-text focus:outline-none focus:border-orion-accent"
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {loading && <LoadingSpinner size="sm" />}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col, colIdx) => {
            const colTasks = tasks.filter((t) => t.status === col.id)
            return (
              <motion.div
                key={col.id}
                className="flex-shrink-0 w-72"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.08, duration: 0.4 }}
              >
                <div className={`flex items-center justify-between mb-3 glass-strong rounded-lg px-3 py-2 ${col.accent}`}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-orion-text font-semibold text-sm">{col.label}</h3>
                    <span className="bg-white/10 text-orion-muted text-xs rounded-full px-2 backdrop-blur-sm">{colTasks.length}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openCreate(col.id)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-48 rounded-xl p-2 transition-all duration-200 ${
                        snapshot.isDraggingOver
                          ? 'glass border border-orion-accent/30 glow-accent'
                          : 'glass border border-white/5'
                      }`}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => openEdit(task)}
                              className={`glass-card p-3 mb-2 cursor-pointer hover:border-[#00f5ff]/40 transition-all duration-200 ${priorityBorderClass[task.priority] || ''} ${
                                snapshot.isDragging ? 'shadow-lg shadow-[#00f5ff]/20 scale-105 glow-cyan' : ''
                              }`}
                            >
                              <p className="text-orion-text text-sm font-medium mb-2">{task.title}</p>
                              <div className="flex items-center justify-between">
                                <Badge type="priority" value={task.priority} />
                                {task.assigned_agent_name && (
                                  <div className="flex items-center gap-1">
                                    <AgentStatusDot status={task.assigned_agent_status || 'idle'} />
                                    <span className="text-orion-muted text-xs truncate max-w-20">{task.assigned_agent_name.replace(' Agent', '')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </motion.div>
            )
          })}
        </div>
      </DragDropContext>
      </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTask ? 'Edit Task' : 'New Task'}>
        <div className="space-y-4">
          <div>
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); if (titleError) setTitleError('') }}
              placeholder="Enter task title"
            />
            {titleError && <p className="text-orion-danger text-xs mt-1">{titleError}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-orion-muted text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="glass border border-white/10 rounded-lg px-3 py-2 text-orion-text w-full focus:outline-none focus:border-orion-accent resize-none"
            />
          </div>
          <Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={priorityOptions} />
          <Select
            label="Assign to Agent (optional)"
            value={form.assigned_agent}
            onChange={(v) => setForm({ ...form, assigned_agent: v })}
            options={agentOptions}
            placeholder="— No Agent —"
          />
          {editTask?.notes && editTask.notes !== 'Agent is working on this task...' && (
            <div className="glass border border-white/10 rounded-xl p-4">
              <p className="text-orion-accent text-xs font-semibold uppercase tracking-wide mb-2">Agent Output</p>
              <p className="text-orion-text text-sm whitespace-pre-wrap leading-relaxed">{editTask.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{editTask ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
