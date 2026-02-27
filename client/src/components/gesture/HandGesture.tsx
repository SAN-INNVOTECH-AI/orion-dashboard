'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ParticleShape } from '@/components/three/ParticleSystem'

// ── Types ────────────────────────────────────────────────
type GestureResult = ParticleShape | null

interface HandGestureProps {
  onGesture: (gesture: ParticleShape) => void
}

// ── Hook: useHandGesture ─────────────────────────────────
export function useHandGesture() {
  const [gesture, setGesture] = useState<GestureResult>(null)
  return { gesture, setGesture }
}

// ── Gesture classification from landmarks ────────────────
function classifyGesture(landmarks: { x: number; y: number; z: number }[]): GestureResult {
  if (landmarks.length < 21) return null

  // Finger tip & pip indices (tip, pip)
  const fingers = [
    [8, 6],   // index
    [12, 10], // middle
    [16, 14], // ring
    [20, 18], // pinky
  ]

  // Thumb: tip x vs ip x (simplified — works for right hand facing camera)
  const thumbUp = landmarks[4].x < landmarks[3].x

  const extended = fingers.map(([tip, pip]) => landmarks[tip].y < landmarks[pip].y)
  const allUp = extended.every(Boolean) && thumbUp
  const allDown = extended.every(v => !v) && !thumbUp
  const peaceSign = extended[0] && extended[1] && !extended[2] && !extended[3]

  if (allUp) return 'galaxy'        // open palm → galaxy mode
  if (allDown) return 'circuit'    // fist → alert/intense state
  if (peaceSign) return 'neural'   // peace → calm state
  return null
}

// ── Component ────────────────────────────────────────────
export default function HandGesture({ onGesture }: HandGestureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<GestureResult>(null)
  const [unsupportedReason, setUnsupportedReason] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handsRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null)
  const lastGestureRef = useRef<GestureResult>(null)
  const gestureCountRef = useRef(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleResults = useCallback((results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0]
      const detected = classifyGesture(lm)

      if (detected) {
        // Require 3 consecutive same detections to avoid flicker
        if (detected === lastGestureRef.current) {
          gestureCountRef.current++
        } else {
          lastGestureRef.current = detected
          gestureCountRef.current = 1
        }

        if (gestureCountRef.current >= 3 && detected !== currentGesture) {
          setCurrentGesture(detected)
          onGesture(detected)
        }
      }
    }
  }, [currentGesture, onGesture])

  // Start / stop camera + MediaPipe hands
  useEffect(() => {
    if (!enabled) {
      // Tear down
      if (cameraRef.current) {
        cameraRef.current.stop()
        cameraRef.current = null
      }
      return
    }

    let cancelled = false

    async function init() {
      try {
        const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        const secureOk = window.isSecureContext || isLocalHost
        const mediaOk = !!navigator.mediaDevices?.getUserMedia

        if (!secureOk || !mediaOk) {
          setUnsupportedReason('Camera gestures need HTTPS (or localhost) with media permissions.')
          setEnabled(false)
          return
        }

        // Dynamic imports — these are heavy WASM modules
        const { Hands } = await import('@mediapipe/hands')
        const { Camera } = await import('@mediapipe/camera_utils')

        if (cancelled) return

        const video = videoRef.current
        if (!video) return

        setUnsupportedReason('')

        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        })
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,       // 0 = lite, fast
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        })
        hands.onResults(handleResults)
        handsRef.current = hands

        const camera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video })
          },
          width: 160,
          height: 120,
        })
        camera.start()
        cameraRef.current = camera
      } catch (err) {
        console.warn('Hand gesture init failed:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      if (cameraRef.current) {
        cameraRef.current.stop()
        cameraRef.current = null
      }
    }
  }, [enabled, handleResults])

  const gestureLabel: Record<string, string> = {
    circuit: 'Alert state (fist)',
    neural: 'Calm state (open palm/peace)',
  }

  return (
    <div className="fixed bottom-4 left-4 z-30 flex flex-col items-start gap-2">
      {/* Webcam preview */}
      {enabled && (
        <div
          className="relative overflow-hidden rounded-xl"
          style={{
            width: 160,
            height: 120,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 0 20px rgba(0,245,255,0.15)',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          {currentGesture && (
            <span
              className="absolute bottom-1 left-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-cyan-300"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {gestureLabel[currentGesture]}
            </span>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setEnabled(v => !v)}
        disabled={!!unsupportedReason}
        className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: enabled ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${enabled ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
          color: enabled ? '#00f5ff' : '#94a3b8',
        }}
      >
        {unsupportedReason ? '🖐 Gesture unavailable' : enabled ? '🖐 Gesture On' : '🖐 Gesture Off'}
      </button>

      {unsupportedReason && (
        <p className="max-w-[220px] text-[10px] text-amber-300 leading-snug">{unsupportedReason}</p>
      )}
    </div>
  )
}
