'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

// ── Shape types ──────────────────────────────────────────
export type ParticleShape = 'galaxy' | 'heart' | 'flower'

interface ParticleSystemProps {
  shape?: ParticleShape
}

// ── Shape generators ─────────────────────────────────────
const PARTICLE_COUNT = 5000

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateGalaxy(i: number, _total: number): [number, number, number] {
  const arms = 3
  const armAngle = ((i % arms) / arms) * Math.PI * 2
  const dist = Math.pow(Math.random(), 0.6) * 8
  const angle = armAngle + dist * 0.6 + (Math.random() - 0.5) * 0.4
  const x = Math.cos(angle) * dist + (Math.random() - 0.5) * 0.5
  const z = Math.sin(angle) * dist + (Math.random() - 0.5) * 0.5
  const y = (Math.random() - 0.5) * 0.4 * (1 - dist / 8)
  return [x, y, z]
}

function generateHeart(i: number, total: number): [number, number, number] {
  const t = (i / total) * Math.PI * 2
  const layer = Math.random()
  const scale = 3.5 * layer
  const x = scale * 16 * Math.pow(Math.sin(t), 3) / 16
  const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16
  const z = (Math.random() - 0.5) * 1.2 * layer
  return [x, y + 0.5, z]
}

function generateFlower(i: number, total: number): [number, number, number] {
  const petals = 6
  const t = (i / total) * Math.PI * 2 * petals
  const r = 3.5 * Math.abs(Math.cos(t / 2)) * Math.pow(Math.random(), 0.5)
  const angle = (i / total) * Math.PI * 2
  const x = r * Math.cos(angle)
  const z = r * Math.sin(angle)
  const y = (Math.random() - 0.5) * 0.6
  return [x, y, z]
}

const shapeGenerators: Record<ParticleShape, (i: number, total: number) => [number, number, number]> = {
  galaxy: generateGalaxy,
  heart: generateHeart,
  flower: generateFlower,
}

// ── Vertex shader ────────────────────────────────────────
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vDist;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vec3 pos = position;
    pos.y += sin(uTime * 0.5 + position.x * 0.5) * 0.08;
    pos.x += cos(uTime * 0.3 + position.z * 0.5) * 0.08;
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = aSize * uPixelRatio * (80.0 / -mvPos.z);
  }
`

// ── Fragment shader (glow disc) ──────────────────────────
const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vDist;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    alpha *= alpha;
    float fog = smoothstep(20.0, 5.0, vDist);
    gl_FragColor = vec4(vColor, alpha * fog * 0.85);
  }
`

// ── Component ────────────────────────────────────────────
export default function ParticleSystem({ shape = 'galaxy' }: ParticleSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const internalsRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
    positions: Float32Array
    targetPositions: Float32Array
    rafId: number
    mouse: { x: number; y: number }
  } | null>(null)

  const currentShapeRef = useRef<ParticleShape>(shape)

  // Morph particles to new shape
  const morphTo = useCallback((newShape: ParticleShape) => {
    const internals = internalsRef.current
    if (!internals) return
    currentShapeRef.current = newShape
    const gen = shapeGenerators[newShape]
    const target = internals.targetPositions

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [x, y, z] = gen(i, PARTICLE_COUNT)
      target[i * 3] = x
      target[i * 3 + 1] = y
      target[i * 3 + 2] = z
    }

    // GSAP morph: animate positions → target
    const posAttr = internals.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    gsap.to(arr, {
      duration: 1.8,
      ease: 'power3.inOut',
      endArray: Array.from(target),
      onUpdate: () => {
        posAttr.needsUpdate = true
      },
    })
  }, [])

  // React to shape prop change
  useEffect(() => {
    if (currentShapeRef.current !== shape) {
      morphTo(shape)
    }
  }, [shape, morphTo])

  // Set up Three.js scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 12

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Geometry
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const colors = new Float32Array(PARTICLE_COUNT * 3)

    const cyan = new THREE.Color('#00f5ff')
    const purple = new THREE.Color('#8b5cf6')
    const white = new THREE.Color('#ffffff')
    const palette = [cyan, purple, white]

    const gen = shapeGenerators[shape]
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [x, y, z] = gen(i, PARTICLE_COUNT)
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      targetPositions[i * 3] = x
      targetPositions[i * 3 + 1] = y
      targetPositions[i * 3 + 2] = z

      sizes[i] = Math.random() * 0.8 + 0.3

      const c = palette[i % 3]
      const mix = Math.random() * 0.3
      colors[i * 3] = c.r + mix
      colors[i * 3 + 1] = c.g + mix
      colors[i * 3 + 2] = c.b + mix
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Mouse tracking
    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    const clock = new THREE.Clock()
    let rafId = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      material.uniforms.uTime.value = elapsed

      // Subtle camera follow mouse (parallax)
      camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.02
      camera.position.y += (mouse.y * 1.0 - camera.position.y) * 0.02
      camera.lookAt(0, 0, 0)

      // Slow rotation
      points.rotation.y = elapsed * 0.05

      renderer.render(scene, camera)
    }
    animate()

    internalsRef.current = {
      scene, camera, renderer, geometry, material,
      positions, targetPositions, rafId, mouse,
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
