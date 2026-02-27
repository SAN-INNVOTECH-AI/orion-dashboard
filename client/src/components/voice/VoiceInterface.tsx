'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ParticleShape } from '@/components/three/ParticleSystem'

// ── Types ────────────────────────────────────────────────
interface VoiceInterfaceProps {
  onShapeCommand: (shape: ParticleShape) => void
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

// ── Mock voice query ─────────────────────────────────────
async function mockVoiceQuery(transcript: string): Promise<string> {
  // Simulate latency
  await new Promise(r => setTimeout(r, 600))

  const lower = transcript.toLowerCase()
  if (lower.includes('status') || lower.includes('agents')) {
    return 'All 6 agents are online. 2 are working, 4 are idle. No errors detected.'
  }
  if (lower.includes('project')) {
    return 'You have 3 active projects. The latest is "Orion Dashboard" with 12 tasks in progress.'
  }
  if (lower.includes('help')) {
    return 'Try saying "show heart", "show galaxy", or "show flower" to change the particles. Or ask about agent status.'
  }
  return `I heard: "${transcript}". Try asking about agent status or projects.`
}

// ── Shape command detection ──────────────────────────────
function detectShapeCommand(text: string): ParticleShape | null {
  const lower = text.toLowerCase()
  if (lower.includes('heart')) return 'heart'
  if (lower.includes('flower')) return 'flower'
  if (lower.includes('galaxy')) return 'galaxy'
  return null
}

// ── Component ────────────────────────────────────────────
export default function VoiceInterface({ onShapeCommand }: VoiceInterfaceProps) {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [supported, setSupported] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Check browser support
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          final += t
        } else {
          interim += t
        }
      }
      setTranscript(final || interim)

      if (final) {
        handleFinalTranscript(final)
      }
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Speech recognition error:', e.error)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFinalTranscript = useCallback(async (text: string) => {
    // Check for shape commands
    const shape = detectShapeCommand(text)
    if (shape) {
      onShapeCommand(shape)
    }

    // Get response from mock backend
    const reply = await mockVoiceQuery(text)
    setResponse(reply)

    // Text-to-speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(reply)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }

    // Clear transcript after delay
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      setTranscript('')
      setResponse('')
    }, 8000)
  }, [onShapeCommand])

  const toggleListening = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return

    if (listening) {
      rec.stop()
      setListening(false)
    } else {
      setTranscript('')
      setResponse('')
      rec.start()
      setListening(true)
    }
  }, [listening])

  if (!supported) {
    return null // Graceful degradation
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3">
      {/* Transcript display */}
      {(transcript || response) && (
        <div
          className="max-w-md rounded-xl px-5 py-3 text-center text-sm"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          {transcript && (
            <p className="text-cyan-300">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
          {response && (
            <p className="mt-1 text-slate-300 text-xs">{response}</p>
          )}
        </div>
      )}

      {/* Voice orb */}
      <button
        onClick={toggleListening}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
        style={{
          background: listening
            ? 'radial-gradient(circle, rgba(0,245,255,0.3), rgba(139,92,246,0.2))'
            : speaking
            ? 'radial-gradient(circle, rgba(139,92,246,0.3), rgba(0,245,255,0.15))'
            : 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${listening ? 'rgba(0,245,255,0.4)' : speaking ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.12)'}`,
          boxShadow: listening
            ? '0 0 30px rgba(0,245,255,0.35), 0 0 60px rgba(0,245,255,0.15)'
            : speaking
            ? '0 0 30px rgba(139,92,246,0.35), 0 0 60px rgba(139,92,246,0.15)'
            : '0 0 15px rgba(0,0,0,0.2)',
        }}
        aria-label={listening ? 'Stop listening' : 'Start voice input'}
      >
        {/* Pulsing ring when active */}
        {(listening || speaking) && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${listening ? 'rgba(0,245,255,0.4)' : 'rgba(139,92,246,0.4)'}`,
              animation: 'voicePulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {/* Microphone icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={listening ? '#00f5ff' : speaking ? '#8b5cf6' : '#94a3b8'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>

      {/* Label */}
      <span
        className="text-[10px] font-medium tracking-wider uppercase"
        style={{
          color: listening ? '#00f5ff' : '#64748b',
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}
      >
        {listening ? 'Listening...' : speaking ? 'Speaking...' : 'Voice'}
      </span>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes voicePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
