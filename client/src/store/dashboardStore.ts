import { create } from 'zustand'
import api from '@/lib/api'

interface Project {
  id: string
  name: string
  description: string
  status: string
  priority: string
  created_at: string
  updated_at: string
}

interface Task {
  id: string
  project_id: string
  project_name?: string
  title: string
  description: string
  status: string
  priority: string
  assigned_to?: string
  assigned_agent?: string
  assigned_agent_name?: string
  assigned_agent_status?: string
  position: number
  created_at: string
  updated_at: string
}

interface Agent {
  id: string
  name: string
  type: string
  description: string
  status: string
  current_task_id?: string
  current_task_title?: string
  last_active: string
}

interface DashboardState {
  projects: Project[]
  tasks: Task[]
  agents: Agent[]
  loading: boolean
  fetchProjects: () => Promise<void>
  fetchTasks: (projectId?: string) => Promise<void>
  fetchAgents: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
  projects: [],
  tasks: [],
  agents: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/projects')
      set({ projects: res.data.data || res.data })
    } finally {
      set({ loading: false })
    }
  },

  fetchTasks: async (projectId?: string) => {
    set({ loading: true })
    try {
      const url = projectId ? `/tasks?project_id=${projectId}` : '/tasks'
      const res = await api.get(url)
      set({ tasks: res.data.data || res.data })
    } finally {
      set({ loading: false })
    }
  },

  fetchAgents: async () => {
    try {
      const res = await api.get('/agents')
      set({ agents: res.data.data || res.data })
    } catch {}
  },
}))
