'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

// ── Shape types ──────────────────────────────────────────
export type ParticleShape = 'galaxy' | 'swarm' | 'circuit' | 'neural'

interface ParticleSystemProps {
  shape?: ParticleShape
}

// ── Constants ────────────────────────────────────────────
const PARTICLE_COUNT = 12000

// ── Shape generators ─────────────────────────────────────
// Each returns [x, y, z]
type ShapeResult = [number, number, number]

// Galaxy: classic spiral core + arms (original Orion vibe)
function generateGalaxy(i: number, total: number): ShapeResult {
  const coreRatio = 0.35
  const inCore = i < total * coreRatio

  if (inCore) {
    const r = Math.pow(Math.random(), 0.25) * 2.6
    const a = Math.random() * Math.PI * 2
    const x = Math.cos(a) * r + (Math.random() - 0.5) * 0.18
    const z = Math.sin(a) * r + (Math.random() - 0.5) * 0.18
    const y = (Math.random() - 0.5) * 0.35
    return [x, y, z]
  }

  const arms = 5
  const armAngle = ((i % arms) / arms) * Math.PI * 2
  const dist = Math.pow(Math.random(), 0.52) * 10.5
  const swirl = dist * 0.78
  const angle = armAngle + swirl + (Math.random() - 0.5) * 0.32
  const spread = 0.28 + dist * 0.02
  const x = Math.cos(angle) * dist + (Math.random() - 0.5) * spread
  const z = Math.sin(angle) * dist + (Math.random() - 0.5) * spread
  const y = (Math.random() - 0.5) * (0.8 - Math.min(dist / 12, 0.6))
  return [x, y, z]
}

// Swarm: diffuse flowing cloud — particles distributed in a soft ellipsoidal volume
function generateSwarm(i: number, total: number): ShapeResult {
  const coreRatio = 0.4
  const inCore = i < total * coreRatio

  if (inCore) {
    // Dense soft core — gaussian-ish distribution
    const r = Math.pow(Math.random(), 0.35) * 3.0
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const x = Math.sin(phi) * Math.cos(theta) * r * 1.1
    const y = Math.sin(phi) * Math.sin(theta) * r * 0.75
    const z = Math.cos(phi) * r * 0.9
    return [x, y, z]
  }

  // Outer wisps — elongated tendrils
  const arm = i % 5
  const armAngle = (arm / 5) * Math.PI * 2
  const dist = Math.pow(Math.random(), 0.5) * 9.0
  const swirl = dist * 0.6 + Math.random() * 0.5
  const angle = armAngle + swirl
  const spread = 0.4 + dist * 0.04
  const x = Math.cos(angle) * dist + (Math.random() - 0.5) * spread
  const z = Math.sin(angle) * dist * 0.5 + (Math.random() - 0.5) * spread * 0.6
  const y = (Math.random() - 0.5) * (1.5 - Math.min(dist / 10, 0.8))
  return [x, y, z]
}

// Circuit: structured grid/stream pattern
function generateCircuit(i: number, total: number): ShapeResult {
  const cols = 120
  const rows = Math.ceil(total / cols)
  const col = i % cols
  const row = Math.floor(i / cols)

  const x = (col / cols - 0.5) * 18 + (Math.random() - 0.5) * 0.18
  const y = (row / rows - 0.5) * 10 + (Math.random() - 0.5) * 0.18
  const z = (Math.random() - 0.5) * 2.8

  if (row % 8 === 0 || col % 14 === 0) {
    return [x * 1.02, y * 1.02, z * 0.6]
  }
  return [x, y, z]
}

// Neural: dense flowing core — fibonnaci sphere with depth
function generateNeural(i: number, total: number): ShapeResult {
  const phi = Math.acos(1 - 2 * ((i + 0.5) / total))
  const theta = Math.PI * (1 + Math.sqrt(5)) * i
  const r = 4.0 + (Math.random() - 0.5) * 3.5

  const x = Math.cos(theta) * Math.sin(phi) * r * 1.1
  const y = Math.sin(theta) * Math.sin(phi) * r * 0.85
  const z = Math.cos(phi) * r * 0.9

  return [x, y, z]
}

const shapeGenerators: Record<ParticleShape, (i: number, total: number) => ShapeResult> = {
  galaxy: generateGalaxy,
  swarm: generateSwarm,
  circuit: generateCircuit,
  neural: generateNeural,
}

// ── Vertex shader ────────────────────────────────────────
// Curl-noise-inspired flowing particle animation with per-particle
// random seed, phase, and scale attributes for organic motion.
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aRandom;
  attribute float aPhase;
  attribute float aScale;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vDist;
  varying float vAlpha;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uDriftStrength;
  uniform float uMode; // 0=swarm, 1=circuit, 2=neural

  //
  // Pseudo curl-noise: multi-octave sine-based 3D displacement
  // Creates smooth, divergence-free-like flow without actual noise textures
  //
  vec3 curlFlow(vec3 p, float t, float seed) {
    // Octave 1: large slow swirls
    float s1 = seed * 6.283;
    vec3 d1 = vec3(
      sin(p.y * 0.3 + t * 0.15 + s1) * cos(p.z * 0.2 + t * 0.12),
      sin(p.z * 0.25 + t * 0.13 + s1 * 1.3) * cos(p.x * 0.3 + t * 0.11),
      sin(p.x * 0.28 + t * 0.14 + s1 * 0.7) * cos(p.y * 0.22 + t * 0.1)
    );

    // Octave 2: medium frequency detail
    float s2 = seed * 3.17 + 1.7;
    vec3 d2 = vec3(
      sin(p.y * 0.7 + t * 0.25 + s2) * 0.5,
      cos(p.z * 0.6 + t * 0.22 + s2 * 1.1) * 0.5,
      sin(p.x * 0.65 + t * 0.2 + s2 * 0.9) * 0.5
    );

    // Octave 3: fine turbulence
    float s3 = seed * 4.89 + 3.2;
    vec3 d3 = vec3(
      cos(p.z * 1.2 + p.y * 0.8 + t * 0.35 + s3) * 0.2,
      sin(p.x * 1.1 + p.z * 0.9 + t * 0.3 + s3 * 1.4) * 0.2,
      cos(p.y * 1.0 + p.x * 0.7 + t * 0.32 + s3 * 0.6) * 0.2
    );

    return d1 + d2 + d3;
  }

  void main() {
    vColor = aColor;

    vec3 pos = position;

    // ── Curl-noise flow displacement ──
    vec3 flow = curlFlow(pos, uTime, aRandom) * uDriftStrength * 0.12;
    pos += flow;

    // ── Per-particle orbital drift for extra organic feel ──
    float orbitSpeed = 0.08 + aRandom * 0.12;
    float orbitRadius = 0.03 + aRandom * 0.04;
    float orbitPhase = aPhase;
    pos.x += sin(uTime * orbitSpeed + orbitPhase) * orbitRadius;
    pos.y += cos(uTime * orbitSpeed * 0.8 + orbitPhase * 1.3) * orbitRadius * 0.8;
    pos.z += sin(uTime * orbitSpeed * 0.6 + orbitPhase * 0.7) * orbitRadius * 0.6;

    // ── Breathing — slow radial pulse ──
    float breathPhase = uTime * 0.3 + aPhase;
    float breathAmt = sin(breathPhase) * 0.008 * (1.0 + aRandom);
    pos *= 1.0 + breathAmt;

    // ── Gentle center attraction to keep cloud cohesive ──
    float dist = length(pos);
    float pullStrength = smoothstep(8.0, 12.0, dist) * 0.003;
    pos -= normalize(pos + 0.001) * pullStrength * dist;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mvPos.z;

    gl_Position = projectionMatrix * mvPos;

    // ── Size: attribute-driven + depth attenuation ──
    float baseSize = aSize * aScale;
    float sizeOsc = 1.0 + sin(uTime * 0.4 + aPhase * 2.0) * 0.08 * aRandom;
    gl_PointSize = baseSize * sizeOsc * uPixelRatio * (80.0 / -mvPos.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 42.0);

    // ── Alpha varies with distance from center for depth ──
    float centerDist = length(position.xy);
    vAlpha = 1.0 - smoothstep(5.0, 11.0, centerDist) * 0.3;
  }
`

// ── Fragment shader — soft luminous circles with glow ──
const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vDist;
  varying float vAlpha;

  void main() {
    // Radial distance from point center
    float d = length(gl_PointCoord - 0.5) * 2.0;

    // Discard outside circle
    if (d > 1.0) discard;

    // Soft luminous falloff — multi-layer glow
    float innerCore = 1.0 - smoothstep(0.0, 0.15, d);
    float midGlow   = 1.0 - smoothstep(0.0, 0.5, d);
    float outerGlow = 1.0 - smoothstep(0.2, 1.0, d);

    float alpha = outerGlow * 0.25 + midGlow * 0.4 + innerCore * 0.35;
    // Softer gamma for luminous feel
    alpha = pow(alpha, 1.4);

    // Depth fog
    float fog = smoothstep(26.0, 3.5, vDist);

    // Color: hot center shifts toward white, outer toward purple tint
    vec3 col = vColor;
    col += innerCore * vec3(0.15, 0.12, 0.18); // white-purple hot center
    col += outerGlow * vec3(0.02, 0.0, 0.06);  // subtle purple fringe

    gl_FragColor = vec4(col, alpha * fog * vAlpha * 0.85);
  }
`

// ── Mode index for uniform ───────────────────────────────
const MODE_INDEX: Record<ParticleShape, number> = {
  galaxy: 0, swarm: 0, circuit: 1, neural: 2,
}

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

  const applyShapePose = useCallback((newShape: ParticleShape) => {
    const internals = internalsRef.current
    if (!internals) return
    const points = internals.scene.children[0] as THREE.Points
    if (!points) return

    if (newShape === 'circuit') {
      points.scale.set(0.9, 1.1, 1)
    } else {
      points.scale.set(1, 1, 1)
    }

    // Per-mode drift strength
    internals.material.uniforms.uDriftStrength.value =
      newShape === 'neural' ? 1.4 : newShape === 'circuit' ? 0.6 : 1.0
    internals.material.uniforms.uMode.value = MODE_INDEX[newShape]
  }, [])

  // Morph particles to new shape
  const morphTo = useCallback((newShape: ParticleShape) => {
    const internals = internalsRef.current
    if (!internals) return
    currentShapeRef.current = newShape
    applyShapePose(newShape)
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
  }, [applyShapePose])

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

    // Geometry + attributes
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const randoms = new Float32Array(PARTICLE_COUNT)
    const phases = new Float32Array(PARTICLE_COUNT)
    const scalesArr = new Float32Array(PARTICLE_COUNT)

    // Color palette: cyan/white with subtle purple tint
    const cyan = new THREE.Color('#00e5ff')
    const cyanDeep = new THREE.Color('#00b0ff')
    const white = new THREE.Color('#e0f0ff')
    const purple = new THREE.Color('#b388ff')
    const palette = [cyan, cyanDeep, cyan, white, cyanDeep, purple]

    const gen = shapeGenerators[shape]
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [x, y, z] = gen(i, PARTICLE_COUNT)
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      targetPositions[i * 3] = x
      targetPositions[i * 3 + 1] = y
      targetPositions[i * 3 + 2] = z

      sizes[i] = Math.random() * 0.7 + 0.35
      randoms[i] = Math.random()
      phases[i] = Math.random() * Math.PI * 2
      scalesArr[i] = 0.7 + Math.random() * 0.6

      const c = palette[i % palette.length]
      const mix = Math.random() * 0.2
      colors[i * 3] = c.r + mix * 0.5
      colors[i * 3 + 1] = c.g + mix * 0.5
      colors[i * 3 + 2] = c.b + mix
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scalesArr, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uDriftStrength: { value: 1.0 },
        uMode: { value: MODE_INDEX[shape] },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Apply initial visual pose
    if (shape === 'circuit') {
      points.scale.set(0.9, 1.1, 1)
    }

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

      // Continuous slow rotation
      points.rotation.y = elapsed * 0.04

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
