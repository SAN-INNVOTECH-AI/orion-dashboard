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
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface User {
  id: string; name: string; email: string; role: string; created_at: string
}

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'viewer', label: 'Viewer' },
]

export default function UsersPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' })

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/dashboard')
  }, [user, router])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/users')
      setUsers(r.data.data || r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'viewer' })
    setShowModal(true)
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, { name: form.name, email: form.email, role: form.role })
      } else {
        if (!form.password.trim()) return
        await api.post('/users', form)
      }
      setShowModal(false)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (id === user?.id) return alert('Cannot delete yourself.')
    if (!window.confirm('Delete this user?')) return
    await api.delete(`/users/${id}`)
    load()
  }

  return (
    <AppLayout title="Users">
      <div className="flex justify-between items-center mb-6">
        <p className="text-orion-muted text-sm">{users.length} users total</p>
        <Button variant="primary" onClick={openCreate}><Plus className="w-4 h-4" /> Add User</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  {['Name', 'Email', 'Role', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-orion-muted font-medium pb-3 pr-4 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.05] glass-row transition-colors">
                    <td className="py-3 pr-4 text-orion-text font-medium">{u.name}</td>
                    <td className="py-3 pr-4 text-orion-muted">{u.email}</td>
                    <td className="py-3 pr-4"><Badge type="role" value={u.role} /></td>
                    <td className="py-3 pr-4 text-orion-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}><Trash2 className="w-3 h-3 text-orion-danger" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-orion-muted">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          {!editUser && (
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          )}
          <Select label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={roleOptions} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{editUser ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
