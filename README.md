# ⭐ Orion Dashboard

**AI-Powered Project Management** — SAN Innvotech

---

## What is Orion?

Orion is an enterprise-grade project management dashboard powered by 17 specialized AI agents. Super admins can create tasks and assign them directly to any agent. The PM Agent autonomously monitors all projects, detects issues, and assigns work to the right agent automatically. All agent activity is streamed live.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (access + refresh tokens) |
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS (Orion dark theme) |
| State | Zustand |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |

---

## Setup

```bash
# Install all dependencies
cd server && npm install
cd ../client && npm install
cd ..
npm install

# Start both server and client
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## Credentials

| User | Password | Role |
|---|---|---|
| admin | admin | Super Admin |
| pm | manager123 | Project Manager |
| viewer | viewer123 | Viewer |

---

## Pages

| Page | Description |
|---|---|
| /dashboard | Stats, cost trend, recent projects, live agent strip |
| /projects | Create/edit/delete projects |
| /kanban | Drag-and-drop task board per project |
| /tasks | (Admin only) Full task management with agent assignment |
| /agents | 17 agent cards with live status + PM Agent runner |
| /analytics | Charts: projects, tasks, AI cost, agent utilization |
| /users | (Admin only) User management |

---

## The 17 Agents

1. **Project Manager Agent** — Master coordinator, timeline, stakeholder communication
2. **Business Analyst Agent** — Requirements gathering, user stories
3. **System Integrator Agent** — Technical architecture, feasibility
4. **UI/UX Designer Agent** — User research, wireframes, visual design
5. **Content & Copywriting Agent** — Website copy, SEO content
6. **Security Specialist Agent** — Security architecture, vulnerability assessment
7. **Database Administrator Agent** — Schema design, optimization, migrations
8. **Web Developer Agent** — React/Next.js web applications
9. **Mobile Developer Agent** — React Native/Expo mobile apps
10. **Performance Optimization Agent** — Core Web Vitals, monitoring
11. **QA Engineer Agent** — Testing, quality assurance, validation
12. **SEO & Digital Marketing Agent** — Technical SEO, conversion optimization
13. **Compliance & Legal Agent** — GDPR, accessibility, privacy policies
14. **DevOps Engineer Agent** — CI/CD, deployment, infrastructure
15. **Training & Documentation Agent** — User guides, training materials
16. **Maintenance & Support Agent** — Ongoing support, SLA management
17. **Video Generation Agent** — AI video creation using ComfyUI + LTX2

---

## PM Agent

Triggered from the **Agents** page → **Run PM Agent** button.

**What it does:**
1. Scans all projects and tasks
2. Detects: stale tasks, projects with no tasks, unassigned work, empty kanban columns
3. Auto-creates tasks for each issue and assigns to the most relevant agent
4. Logs every action to the database
5. Returns a detailed report shown in-UI

**Smart assignment logic:**
- Dev/code issues → Web Developer Agent
- Testing gaps → QA Engineer Agent
- Missing docs → Training & Documentation Agent
- Security findings → Security Specialist Agent
- Performance issues → Performance Optimization Agent
- Others → Project Manager Agent

---

## Live Progress (SSE)

`GET /live-progress` — Server-Sent Events endpoint streaming agent statuses every 3 seconds. Frontend connects via `EventSource` — no polling, real-time updates on Dashboard and Agents pages.
