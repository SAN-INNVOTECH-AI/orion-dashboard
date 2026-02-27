'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import dynamic from 'next/dynamic'
import type { ParticleShape } from '@/components/three/ParticleSystem'
import { useDashboardStore } from '@/store/dashboardStore'
import { motion } from 'framer-motion'

const ParticleSystem = dynamic(() => import('@/components/three/ParticleSystem'), { ssr: false })
const HandGesture = dynamic(() => import('@/components/gesture/HandGesture'), { ssr: false })
const VoiceInterface = dynamic(() => import('@/components/voice/VoiceInterface'), { ssr: false })


export default function OrionPage() {
  const [shape, setShape] = useState<ParticleShape>('galaxy')
  const { agents, fetchAgents } = useDashboardStore()
  const [liveAgents, setLiveAgents] = useState(agents)
  const apiBase = '/api'
  const feedRef = useRef<HTMLDivElement>(null)

  const handleShapeChange = useCallback((newShape: ParticleShape) => {
    setShape(newShape)
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

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

  const workingAgents = liveAgents.filter((a) => a.status === 'working')

  return (
    <AppLayout title="Orion">
      <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <div className="absolute top-4 left-4 z-20 glass-card px-3 py-2 text-xs">
          <span className="text-orion-muted mr-2">Live agents</span>
          <span className="text-cyan-300 font-semibold">{workingAgents.length}</span>
          <span className="text-orion-muted"> / {liveAgents.length}</span>
        </div>

        <motion.div
          ref={feedRef}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute top-16 left-4 z-20 glass-card p-4 w-[360px]"
        >
          <h3 className="text-orion-text text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            Agent Activity
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot inline-block" />
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {workingAgents.length > 0 ? (
              workingAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                  <span className="text-orion-text truncate">{agent.name}</span>
                  <span className="text-orion-muted truncate flex-1 text-right">
                    {agent.current_task_title || 'Processing...'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-orion-muted text-xs">No active agents. All {liveAgents.length} agents idle.</p>
            )}
          </div>
        </motion.div>

        {/* Three.js particle background — fills the content area */}
        <div className="absolute inset-0 -m-6 overflow-hidden rounded-xl">
          <ParticleSystem shape={shape} />
        </div>

        {/* Central content overlay */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
          {/* Title */}
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-6xl font-black tracking-widest sm:text-7xl md:text-8xl"
            style={{
              background: 'linear-gradient(135deg, #00f5ff 0%, #8b5cf6 50%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(0,245,255,0.3))',
            }}
          >
            ORION
          </motion.h1>

          {/* Status text */}
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-orion-muted text-sm tracking-[0.2em] uppercase"
          >
            {workingAgents.length > 0
              ? `${workingAgents.length} agent${workingAgents.length > 1 ? 's' : ''} working`
              : 'All systems idle'}
          </motion.p>


        </div>

        {/* Hand gesture (bottom-left) */}
        <HandGesture onGesture={handleShapeChange} />

        {/* Voice interface (bottom-center) */}
        <VoiceInterface onShapeCommand={handleShapeChange} />
      </div>
    </AppLayout>
  )
}
