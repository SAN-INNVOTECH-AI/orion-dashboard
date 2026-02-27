/**
 * POST /pm-agent/execute/:project_id
 * Runs all tasks sequentially by phase. Each agent calls Claude to do real work.
 * Streams SSE progress updates back to the dashboard Kanban.
 *
 * Phases run in order 1-7. Within a phase, tasks run sequentially.
 * After each task: status moves todo → in_progress → done, notes added.
 */
const { v4: uuidv4 } = require('uuid')
const { callLLM } = require('./llm')

// Agent type → friendly description for prompting
const AGENT_PERSONAS = {
  business_analyst:       'You are a senior Business Analyst. Analyze requirements, create user stories, and define acceptance criteria.',
  uiux_designer:          'You are a senior UI/UX Designer. Design user flows, screen layouts, and interaction patterns.',
  system_integrator:      'You are a System Architect. Design system architecture, API contracts, and integration patterns.',
  database_admin:         'You are a Database Administrator. Design database schemas, relationships, indexes, and migrations.',
  mobile_developer:       'You are a Senior Mobile Developer (React Native / Flutter). Write implementation plans and code structures.',
  web_developer:          'You are a Senior Full-Stack Web Developer. Design API endpoints, backend logic, and frontend components.',
  qa_engineer:            'You are a QA Engineer. Create test plans, test cases, and identify edge cases.',
  security_specialist:    'You are a Security Engineer. Audit for vulnerabilities, OWASP issues, and write security requirements.',
  performance_optimizer:  'You are a Performance Engineer. Identify bottlenecks and write optimization strategies.',
  devops_engineer:        'You are a DevOps Engineer. Design CI/CD pipelines, infrastructure, and deployment strategies.',
  training_docs:          'You are a Technical Writer. Write user guides, API docs, and training materials.',
  content_copywriting:    'You are a Product Copywriter. Write app store descriptions, onboarding copy, and marketing content.',
  project_manager:        'You are a Project Manager. Summarize project status, flag risks, and write the final delivery report.',
}

module.exports = function executeRoute(db, sseClients) {
  return async function (req, res) {
    const { project_id } = req.params
    if (!project_id) return res.status(400).json({ success: false, message: 'project_id required' })

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id)
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' })

    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ success: false, message: 'No LLM key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' })
    }

    // Ensure notes + phase columns exist
    try { db.exec('ALTER TABLE tasks ADD COLUMN notes TEXT') } catch {}
    try { db.exec('ALTER TABLE tasks ADD COLUMN phase INTEGER DEFAULT 1') } catch {}
    const now = () => new Date().toISOString()

    // Helper: broadcast SSE to all dashboard clients
    function broadcast(payload) {
      const data = JSON.stringify(payload)
      if (sseClients && sseClients.size > 0) {
        sseClients.forEach(client => {
          try { client.write(`data: ${data}\n\n`) } catch {}
        })
      }
    }

    // Helper: update a task status + notes in DB and broadcast
    function updateTask(taskId, status, notes, agentId) {
      const n = now()
      db.prepare('UPDATE tasks SET status = ?, notes = ?, updated_at = ? WHERE id = ?')
        .run(status, notes, n, taskId)
      if (agentId) {
        db.prepare('UPDATE agents SET status = ?, last_active = ? WHERE id = ?')
          .run(status === 'done' ? 'idle' : 'working', n, agentId)
      }
      broadcast({ type: 'task_update', taskId, status, notes, updatedAt: n })
    }

    // Optional phase range (e.g. run only phases 1-2 for approval gate)
    const minPhase = parseInt(req.query.min_phase) || 1
    const maxPhase = parseInt(req.query.max_phase) || 99

    // Get all tasks for this project, ordered by phase
    const tasks = db.prepare(
      `SELECT t.*, a.name as agent_name, a.type as agent_type
       FROM tasks t LEFT JOIN agents a ON t.assigned_agent = a.id
       WHERE t.project_id = ?
       ORDER BY COALESCE(t.phase, 1), t.position`
    ).all(project_id)

    if (tasks.length === 0)
      return res.status(400).json({ success: false, message: 'No tasks found for this project. Run ingest first.' })

    // Group by phase
    const phaseMap = {}
    tasks.forEach(t => {
      const phase = t.phase || 1
      if (!phaseMap[phase]) phaseMap[phase] = []
      phaseMap[phase].push(t)
    })

    const phases = Object.keys(phaseMap).map(Number).sort((a, b) => a - b).filter(p => p >= minPhase && p <= maxPhase)

    // Respond immediately — execution runs async
    res.json({
      success: true,
      data: {
        message: `Execution started for "${project.name}". ${tasks.length} tasks across ${phases.length} phases.`,
        project_id,
        tasks: tasks.length,
        phases: phases.length,
        awaiting_approval: maxPhase < 7,
      },
    })

    // ── Resume support: reset any stuck in_progress tasks back to todo ──
    db.prepare(`UPDATE tasks SET status = 'todo', updated_at = ? WHERE project_id = ? AND status = 'in_progress'`)
      .run(now(), project_id)

    // ── Run phases sequentially ──
    ;(async () => {
      try {
        broadcast({ type: 'execution_start', project_id, project_name: project.name, total_phases: phases.length })

        for (const phase of phases) {
          const phaseTasks = phaseMap[phase]
          const phaseName = phaseTasks[0]?.phase_name || `Phase ${phase}`

          // Re-fetch task statuses fresh (in case this is a resume)
          const freshStatuses = {}
          db.prepare(`SELECT id, status FROM tasks WHERE project_id = ?`).all(project_id)
            .forEach(t => { freshStatuses[t.id] = t.status })

          const pendingTasks = phaseTasks.filter(t => freshStatuses[t.id] !== 'done')

          if (pendingTasks.length === 0) {
            broadcast({ type: 'phase_skip', phase, phase_name: phaseName, reason: 'already complete' })
            continue
          }

          broadcast({ type: 'phase_start', phase, phase_name: phaseName, task_count: pendingTasks.length })

          for (const task of pendingTasks) {
            const persona = AGENT_PERSONAS[task.agent_type] || 'You are an AI agent.'

            // Mark in_progress
            updateTask(task.id, 'in_progress', 'Agent is working on this task...', task.assigned_agent)
            broadcast({ type: 'task_start', taskId: task.id, agent: task.agent_name, title: task.title })

            let agentOutput = ''
            // Retry with backoff on rate limit
            const MAX_RETRIES = 4
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
              try {
                const llm = await callLLM({
                  anthropicModel: 'claude-haiku-4-5',
                  maxTokens: 1024,
                  userPrompt: `${persona}

PROJECT: ${project.name}
PROJECT CONTEXT: ${project.description || 'No additional context'}

YOUR TASK: ${task.title}
TASK DETAILS: ${task.description || 'Complete this task based on the project context.'}

Execute this task. Be specific, practical, and reference the actual project. Provide a detailed work output in 200-400 words. Format with clear sections.`,
                })
                agentOutput = llm.text
                break  // success
              } catch (err) {
                const isRateLimit = err?.status === 429 || err?.message?.includes('rate limit') || err?.message?.includes('overloaded')
                if (isRateLimit && attempt < MAX_RETRIES) {
                  const waitMs = Math.pow(2, attempt) * 5000  // 10s, 20s, 40s
                  broadcast({ type: 'rate_limit', taskId: task.id, retry: attempt, wait_ms: waitMs })
                  updateTask(task.id, 'in_progress', `Rate limited. Retrying in ${waitMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`, task.assigned_agent)
                  await new Promise(r => setTimeout(r, waitMs))
                } else {
                  agentOutput = `Error: ${err.message}`
                  break
                }
              }
            }

            // Mark done with output
            updateTask(task.id, 'done', agentOutput, task.assigned_agent)

            // Log to agent_logs
            db.prepare(
              'INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).run(uuidv4(), task.assigned_agent, task.agent_type || 'unknown', 'task_executed', agentOutput.slice(0, 500), project_id, task.id, now())

            broadcast({ type: 'task_done', taskId: task.id, agent: task.agent_name, title: task.title, output_preview: agentOutput.slice(0, 150) })

            // Brief pause between tasks to avoid hammering API
            await new Promise(r => setTimeout(r, 800))
          }

          broadcast({ type: 'phase_done', phase, phase_name: phaseName })
        }

        // Mark project complete only if all phases were included
        if (maxPhase >= 7) {
          db.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
            .run('completed', now(), project_id)
        }

        broadcast({ type: 'execution_done', project_id, project_name: project.name, awaiting_approval: maxPhase < 7 })

      } catch (err) {
        console.error('[execute]', err)
        broadcast({ type: 'execution_error', project_id, error: err.message })
      }
    })()
  }
}
