# Premium UI Overhaul Spec — Orion Dashboard

## Project: C:\Work-Data\SAN-Git-Repos\Orion-Projects\orion-dashboard
## Branch: feature/premium-ui-overhaul
## Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS
## Backend: Express on port 3001 (don't touch backend code)

## IMPORTANT RULES
- Only modify files inside `client/` folder
- Do NOT touch `server/` folder at all
- The app uses Tailwind CSS with custom CSS variables (--orion-bg, --orion-text, --orion-card, --orion-border, --orion-accent, --orion-muted, --orion-darker, --orion-danger)
- Dark mode is default. Light mode uses `.light` class on body
- Use 'use client' directive for all interactive components
- API base: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
- Auth uses zustand store (useAuthStore) with JWT in localStorage

## Dependencies Already Installed
- three + @types/three
- gsap
- @studio-freight/lenis (import as lenis)
- animejs
- @mediapipe/hands + @mediapipe/camera_utils
- framer-motion (already existed)
- lucide-react (already existed)
- recharts (already existed)

## PHASE 1: Orion Landing Page (NEW route: `/`)

### 1A: Three.js Particle System (`client/src/components/three/ParticleSystem.tsx`)
- Create a full-screen Three.js canvas as background
- 5000+ particles forming shapes: galaxy (default), heart, flower
- Particles should have glow/bloom effect
- Smooth morphing animation between shapes using GSAP
- Interactive: particles respond to mouse movement (parallax/repel)
- Color palette: cyan (#00f5ff), purple (#8b5cf6), white accents
- Performance: use BufferGeometry + ShaderMaterial, requestAnimationFrame

### 1B: Hand Gesture Detection (`client/src/components/gesture/HandGesture.tsx`)
- Use @mediapipe/hands for real-time hand tracking via webcam
- Detect gestures:
  - Open palm (5 fingers spread) → galaxy shape
  - Fist (closed hand) → heart shape  
  - Peace sign (2 fingers up) → flower shape
- Show small webcam preview in bottom-left corner (160x120, rounded, glassmorphism border)
- Export a hook: useHandGesture() that returns current gesture string
- Include toggle button to enable/disable camera

### 1C: Voice Interface (`client/src/components/voice/VoiceInterface.tsx`)
- Speech-to-text: Web Speech API (SpeechRecognition)
- Text-to-speech: Web Speech API (SpeechSynthesis) 
- Create a floating voice orb (pulsing when listening, glowing when speaking)
- When user speaks, send transcript to backend: POST /pm-agent/voice-query (we'll add this endpoint)
  - For now, create a mock that returns agent statuses
- Display live transcript text with fade animation
- Voice commands should also trigger particle shape changes:
  - "show heart" / "heart" → heart particles
  - "show flower" / "flower" → flower particles  
  - "show galaxy" / "galaxy" → galaxy particles

### 1D: Landing Page Layout (`client/src/app/page.tsx`)
- Full-screen layout with Three.js particle background
- Center: Large "ORION" text with glassmorphism card behind it
- Subtitle: "AI-Powered Project Orchestration"
- Voice orb floating at bottom center
- Hand gesture cam preview at bottom-left
- "Enter Dashboard" button that links to /login
- Current particle shape indicator (small badge)
- All text should have text-shadow for readability over particles

## PHASE 2: Glassmorphism Design System

### 2A: Update global styles (`client/src/app/globals.css`)
- Add glassmorphism utility classes:
  - .glass — backdrop-blur-xl, bg-white/5, border border-white/10
  - .glass-strong — backdrop-blur-2xl, bg-white/10, border border-white/15
  - .glass-card — rounded-2xl version with shadow
- Add glow utilities for accent elements
- Keep existing CSS variables, add new ones for glass effects

### 2B: Update UI Components
- `Button.tsx` — glass effect on hover, anime.js ripple on click
- `Card.tsx` — glassmorphism background, subtle border glow on hover
- `Badge.tsx` — glass effect with colored glow per type
- `Modal.tsx` — glass overlay + glass content card
- `Input.tsx` — glass background, focus glow effect

### 2C: Update Layout Components
- `Sidebar.tsx` — full glassmorphism, blur sidebar, active item glow
- `Header.tsx` — glass header bar, keep LLM status badge
- `AppLayout.tsx` — subtle animated gradient background behind glass panels

## PHASE 3: Page-Level Upgrades

### 3A: Dashboard (`/dashboard`)
- Stats cards with glass effect + anime.js counter animations
- Chart cards with glass borders
- GSAP scroll-triggered section reveals

### 3B: Projects/Kanban (`/kanban`, `/projects`)
- Glass kanban columns
- Drag cards with glass effect
- Smooth transitions on card move

### 3C: Agents (`/agents`)
- Agent cards with glass effect
- Status indicator with pulsing glow (green=idle, blue=working, red=error)
- anime.js entrance animations

### 3D: Analytics (`/analytics`)
- Glass chart containers
- Animated counters for stats
- GSAP scroll reveals

### 3E: Ingest/New Project (`/ingest`)
- Glass form cards
- Phase pipeline with glass chips + glow for active phase
- Keep all existing functionality (stack strategist, approval gate)

## PHASE 4: Lenis Smooth Scroll + GSAP ScrollTrigger

### 4A: Setup Lenis (`client/src/components/scroll/SmoothScroll.tsx`)
- Wrap app in Lenis smooth scroll provider
- Register GSAP ScrollTrigger with Lenis
- Add to AppLayout

### 4B: Scroll Animations
- Section reveal animations (fade up) on all dashboard sections
- Parallax effect on hero/header areas
- Staggered card entrance on scroll

## PHASE 5: Micro-interactions (anime.js)

- Button hover/click ripple effects
- Card hover lift + glow intensify
- Page transition fades
- Number counter animations on dashboard stats
- Sidebar nav item hover micro-animation
- Toast/notification slide-in animations

## Quality Checklist
- No TypeScript errors (use 'any' sparingly, prefer proper types)
- No console errors
- Responsive: works on 1920px, 1440px, 1024px, 768px
- Performance: Three.js canvas should maintain 60fps
- Accessibility: voice controls as enhancement, not requirement
- All existing functionality must continue working (login, projects, kanban, agents, ingest, analytics)
