# UI Fix Spec — Orion Dashboard

## Project: C:\Work-Data\SAN-Git-Repos\Orion-Projects\orion-dashboard
## Branch: feature/premium-ui-overhaul
## Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS
## ONLY modify files inside `client/` folder. Do NOT touch `server/` at all.

## Dependencies Available
- three + @types/three
- gsap (includes ScrollTrigger)
- @studio-freight/lenis
- animejs (v4 — use named export `animate`, NOT `mod.default`)
- @mediapipe/hands + @mediapipe/camera_utils
- framer-motion, lucide-react, recharts

## FIX 1: Move Particle System to Post-Login "/orion" Page

### Current Problem
- Three.js particles + voice + gestures are on `/` (pre-login landing)
- Should be AFTER login on a dedicated `/orion` route

### What to Do
1. Create `client/src/app/orion/page.tsx` — this is the "Orion" page:
   - Uses `AppLayout` (sidebar + header, requires auth)
   - Full-area Three.js `ParticleSystem` as background behind content
   - `VoiceInterface` floating orb at bottom center
   - `HandGesture` camera preview at bottom-left
   - Center content: "ORION" title, real-time status text, agent activity feed
   - No manual shape-switch buttons — shapes change ONLY via voice commands and hand gestures
   
2. Update `client/src/app/page.tsx` — revert to a simple redirect:
   - If logged in → redirect to `/dashboard`
   - If not logged in → redirect to `/login`
   
3. Add "Orion" as FIRST item in Sidebar navigation (before Dashboard)
   - Icon: use `Sparkles` from lucide-react
   - Path: `/orion`

## FIX 2: Remove Manual Shape Buttons

In the ParticleSystem or Orion page:
- Do NOT render any manual galaxy/heart/flower toggle buttons
- Shape changes happen ONLY through:
  - Voice commands: user says "heart", "flower", "galaxy"
  - Hand gestures: open palm = galaxy, fist = heart, peace = flower
- Keep the small shape indicator badge (just shows current shape, not clickable)

## FIX 3: FULL Visual Overhaul on ALL Pages

This is the main issue. Every page needs to look premium. Here's what to do:

### Global Changes

#### `globals.css` — Expand glass utilities + add new animations
- `.glass` — backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-lg
- `.glass-strong` — backdrop-blur-2xl bg-white/[0.07] border border-white/[0.12]
- `.glass-card` — glass + rounded-2xl + hover:border-white/[0.18] transition
- `.glass-sidebar` — backdrop-blur-3xl bg-black/40 border-r border-white/[0.06]
- `.glass-header` — backdrop-blur-xl bg-black/30 border-b border-white/[0.06]
- `.glow-accent` — box-shadow: 0 0 20px rgba(0,245,255,0.15)
- `.glow-text` — text-shadow: 0 0 10px rgba(0,245,255,0.3)
- Add keyframes: `@keyframes float`, `@keyframes pulse-glow`, `@keyframes slide-up`, `@keyframes fade-in`
- Add `.animate-float`, `.animate-pulse-glow`, `.animate-slide-up`, `.animate-fade-in` classes
- Background: subtle animated gradient (dark purple to dark blue, slow movement)

#### Layout: `Sidebar.tsx`
- Full glassmorphism sidebar (glass-sidebar class)
- Nav items: glass hover effect, active item has cyan left border glow + glass-strong bg
- Orion logo at top with subtle glow
- Smooth nav item transitions with anime.js on hover
- Add `/orion` as first nav item

#### Layout: `Header.tsx`
- Glass header (glass-header class)
- Title with subtle glow-text effect
- User info + badges with glass pill styling
- Keep LLM disconnected badge (already there)

#### Layout: `AppLayout.tsx`
- Animated gradient background (very subtle, dark)
- Lenis SmoothScroll wrapper (already added)
- Page transition animation on route change

### Page-by-Page Overhaul

#### `/login` — Login Page
- Full-screen animated gradient background
- Glass login card (center)
- GSAP entrance animation (card scales up + fades in)
- Input fields with glass styling + focus glow
- Button with glass hover + ripple effect
- Floating particles or subtle bokeh effect in background (simple CSS, not Three.js)

#### `/dashboard` — Dashboard
- Stats cards: glass-card with colored left accent border + glow
- anime.js animated number counters (count up from 0)
- Charts wrapped in glass-card containers
- Recent projects list with glass rows + hover glow
- GSAP ScrollTrigger: staggered card entrance (0.1s delay between each)
- Agent status section with pulsing status dots

#### `/agents` — Agent Fleet
- Agent cards: glass-card with status-colored top border
  - idle = green glow, working = cyan pulse, error = red glow
- anime.js staggered entrance animation
- Hover: card lifts up (translateY -4px) + border brightens
- "Run PM Agent" button with glass styling + ripple

#### `/kanban` — Kanban Board
- Column headers: glass-strong with colored accent
- Task cards: glass-card with priority-colored left border
- Drag preview: glass effect with slight scale up
- Column backgrounds: glass with very low opacity
- Smooth card transitions on drag/drop

#### `/analytics` — Analytics
- Chart containers: glass-card
- Stats row at top: glass pills with anime.js counters
- GSAP ScrollTrigger reveals for each chart section
- Tooltip styling: glass with backdrop-blur

#### `/ingest` — New Project
- Glass form card
- Phase pipeline chips: glass with glow for active/completed
- Stack strategist section: glass-card with cyan accent
- Approval gate section: glass-card with yellow/green accent
- Progress log: glass terminal-style container with monospace text

#### `/projects` — Projects List
- Table/list rows: glass hover effect
- Status badges: glass pills with colored glow
- Priority indicators: colored dot with pulse animation

#### `/tasks` and `/users` — Similar Treatment
- Glass table rows
- Hover glow effects
- Staggered entrance animations

### Animation Details

#### GSAP Usage
- Page load: hero elements animate in (opacity 0→1, y 30→0, stagger 0.1s)
- ScrollTrigger: sections reveal as you scroll (already partially done, extend to ALL pages)
- Card hover: subtle scale(1.02) with GSAP

#### Lenis Usage  
- Already wrapped in AppLayout via SmoothScroll component
- Ensure all pages have enough content height for smooth scroll to feel natural
- Smooth anchor scrolling if any in-page links exist

#### anime.js Usage
- Number counters: animate from 0 to target value on mount (duration 1.5s, easeOutExpo)
- Button click ripple: expanding circle from click point
- Card entrance: staggered translateY + opacity (delay 50ms per card)
- Status dots: continuous pulse animation for "working" agents

### Color Palette (keep existing CSS vars, enhance)
- Primary bg: very dark navy/black (#0a0a0f to #0f0f1a)
- Glass surfaces: white/[0.03] to white/[0.08]
- Accent: cyan (#00f5ff)
- Secondary accent: purple (#8b5cf6)  
- Success: emerald (#10b981)
- Warning: amber (#f59e0b)
- Danger: red (#ef4444)
- Text: white with varying opacity levels
- Borders: white/[0.06] to white/[0.15]

### Performance Rules
- Lazy load Three.js components with `dynamic(() => ..., { ssr: false })`
- Use `will-change: transform` on animated elements
- Debounce scroll handlers
- Keep CSS animations for simple effects (pulse, float)
- Use GSAP only for complex scroll-triggered sequences
- anime.js for one-time mount animations

### Quality Checklist
- Build must pass (`npx next build`)
- No TypeScript errors
- No unused imports
- animejs v4: use `import('animejs').then(({ animate }) => { ... })` — NOT mod.default
- All existing functionality preserved (login, CRUD, kanban drag, ingest pipeline, SSE live updates)
- Responsive at 1920px, 1440px, 1024px, 768px
