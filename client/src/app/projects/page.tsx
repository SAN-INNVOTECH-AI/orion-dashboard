'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Project {
  id: string; name: string; description: string; status: string; priority: string; created_at: string
}
interface FormErrors { name?: string }

const statusOptions = [
  { value: 'planning',    label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review',      label: 'Review' },
  { value: 'completed',   label: 'Completed' },
  { value: 'on_hold',     label: 'On Hold' },
]
const priorityOptions = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
]

export default function ProjectsPage() {
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Project | null>(null)
  const [form, setForm]           = useState({ name: '', description: '', status: 'planning', priority: 'medium' })
  const [errors, setErrors]       = useState<FormErrors>({})
  const [saving, setSaving]       = useState(false)
  const { user }   = useAuthStore()
  const canEdit    = user?.role === 'admin' || user?.role === 'project_manager'

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/projects')
      setProjects(r.data.data || r.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.name.trim())         errs.name = 'Project name is required'
    else if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openCreate = () => {
    setEditing(null)
    setErrors({})
    setForm({ name: '', description: '', status: 'planning', priority: 'medium' })
    setShowModal(true)
  }

  const openEdit = (p: Project) => {
    setEditing(p)
    setErrors({})
    setForm({ name: p.name, description: p.description, status: p.status, priority: p.priority })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/projects/${editing.id}`, form)
      } else {
        await api.post('/projects', form)
      }
      setShowModal(false)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project and all its tasks?')) return
    await api.delete(`/projects/${id}`)
    load()
  }

  return (
    <AppLayout title="Projects">
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-orion-muted text-sm">
          {projects.length} project{projects.length !== 1 ? 's' : ''} total
        </p>
        {canEdit && (
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {['Name', 'Status', 'Priority', 'Description', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-orion-muted font-medium pb-3 pr-4 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {projects.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="border-b border-white/[0.05] glass-row transition-colors"
                    >
                      <td className="py-3 pr-4 text-orion-text font-medium max-w-48 truncate">{p.name}</td>
                      <td className="py-3 pr-4"><Badge type="status" value={p.status} /></td>
                      <td className="py-3 pr-4"><Badge type="priority" value={p.priority} /></td>
                      <td className="py-3 pr-4 text-orion-muted max-w-48 truncate">{p.description || 'No description'}</td>
                      <td className="py-3 pr-4 text-orion-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="w-3 h-3 text-orion-danger" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-orion-muted">
                      No projects yet. Create your first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Project' : 'New Project'}>
        <div className="space-y-4">
          <Input
            label="Project Name *"
            value={form.name}
            onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: undefined }) }}
            error={errors.name}
            showValid
            placeholder="e.g. Mobile App Redesign"
          />

          <div className="flex flex-col gap-1">
            <label className="text-orion-muted text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="What is this project about? (optional)"
              className="glass border border-white/10 rounded-lg px-3 py-2.5 text-orion-text placeholder-orion-muted/50 w-full focus:outline-none focus:border-[#00f5ff]/50 resize-none text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={statusOptions} />
            <Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={priorityOptions} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
