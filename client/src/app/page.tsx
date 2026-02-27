'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { ParticleShape } from '@/components/three/ParticleSystem'

// Dynamic imports — these are heavy and should not be SSR'd
const ParticleSystem = dynamic(() => import('@/components/three/ParticleSystem'), { ssr: false })
const HandGesture = dynamic(() => import('@/components/gesture/HandGesture'), { ssr: false })
const VoiceInterface = dynamic(() => import('@/components/voice/VoiceInterface'), { ssr: false })

const shapeLabels: Record<ParticleShape, string> = {
  galaxy: 'Galaxy',
  heart: 'Heart',
  flower: 'Flower',
}

const shapeColors: Record<ParticleShape, string> = {
  galaxy: '#00f5ff',
  heart: '#f472b6',
  flower: '#a78bfa',
}

export default function Home() {
  const [shape, setShape] = useState<ParticleShape>('galaxy')

  const handleShapeChange = useCallback((newShape: ParticleShape) => {
    setShape(newShape)
  }, [])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Three.js particle background — full-screen */}
      <ParticleSystem shape={shape} />

      {/* Central content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        {/* Glassmorphism card */}
        <div
          className="rounded-3xl px-12 py-10 sm:px-16 sm:py-12"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Title */}
          <h1
            className="text-6xl font-black tracking-widest sm:text-7xl md:text-8xl"
            style={{
              background: 'linear-gradient(135deg, #00f5ff 0%, #8b5cf6 50%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(0,245,255,0.3))',
            }}
          >
            ORION
          </h1>

          {/* Subtitle */}
          <p
            className="mt-3 text-base font-light tracking-[0.25em] uppercase sm:text-lg"
            style={{
              color: '#94a3b8',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}
          >
            AI-Powered Project Orchestration
          </p>

          {/* Enter button */}
          <Link href="/login">
            <button
              className="mt-8 rounded-xl px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(139,92,246,0.15))',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(0,245,255,0.2)',
                color: '#00f5ff',
                textShadow: '0 0 10px rgba(0,245,255,0.3)',
                boxShadow: '0 0 25px rgba(0,245,255,0.1), 0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              Enter Dashboard
            </button>
          </Link>
        </div>

        {/* Shape indicator badge */}
        <div
          className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wider uppercase"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: shapeColors[shape],
            textShadow: `0 0 8px ${shapeColors[shape]}44`,
          }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: shapeColors[shape],
              boxShadow: `0 0 6px ${shapeColors[shape]}`,
            }}
          />
          {shapeLabels[shape]} Mode
        </div>

        {/* Shape quick-switch buttons */}
        <div className="flex gap-2">
          {(['galaxy', 'heart', 'flower'] as ParticleShape[]).map((s) => (
            <button
              key={s}
              onClick={() => handleShapeChange(s)}
              className="rounded-lg px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase transition-all hover:scale-105"
              style={{
                background: shape === s ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${shape === s ? 'rgba(0,245,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                color: shape === s ? shapeColors[s] : '#64748b',
              }}
            >
              {shapeLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Hand gesture (bottom-left) */}
      <HandGesture onGesture={handleShapeChange} />

      {/* Voice interface (bottom-center) */}
      <VoiceInterface onShapeCommand={handleShapeChange} />
    </main>
  )
}
