/**
 * POST /pm-agent/ingest
 * Accepts a project document (text, Google Doc URL, or base64 PDF/Word),
 * calls Claude to create a full task breakdown, and stores it in the DB.
 *
 * Body: { name, document_text?, google_doc_url?, document_base64?, document_type? }
 */
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')
const { callLLM } = require('./llm')
const mammoth = require('mammoth')

// Agent type → phase mapping
const AGENT_PHASES = [
  { phase: 1, name: 'Discovery',    types: ['business_analyst'] },
  { phase: 2, name: 'Design',       types: ['uiux_designer'] },
  { phase: 3, name: 'Architecture', types: ['system_integrator', 'database_admin'] },
  { phase: 4, name: 'Development',  types: ['mobile_developer', 'web_developer'] },
  { phase: 5, name: 'Quality',      types: ['qa_engineer', 'security_specialist', 'performance_optimizer'] },
  { phase: 6, name: 'Launch',       types: ['devops_engineer', 'training_docs', 'content_copywriting'] },
  { phase: 7, name: 'Review',       types: ['project_manager'] },
]

// All agent types in order
const ALL_AGENT_TYPES = AGENT_PHASES.flatMap(p => p.types)

async function fetchGoogleDoc(url) {
  // Convert Google Doc URL to plain text export
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error('Invalid Google Doc URL')
  const docId = match[1]
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
  const res = await axios.get(exportUrl, { responseType: 'text', timeout: 15000 })
  return res.data
}

async function parseDocument(body) {
  if (body.document_text) return body.document_text
  if (body.google_doc_url) return await fetchGoogleDoc(body.google_doc_url)
  if (body.document_base64 && body.document_type === 'docx') {
    const buf = Buffer.from(body.document_base64, 'base64')
    const result = await mammoth.extractRawText({ buffer: buf })
    return result.value
  }
  if (body.document_base64 && body.document_type === 'pdf') {
    // pdf-parse loaded lazily to avoid startup errors
    const pdfParse = require('pdf-parse')
    const buf = Buffer.from(body.document_base64, 'base64')
    const result = await pdfParse(buf)
    return result.text
  }
  throw new Error('No document provided. Send document_text, google_doc_url, or document_base64.')
}

module.exports = function ingestRoute(db) {
  return async function (req, res) {
    try {
      const { name, priority = 'high', status = 'planning', llm_provider = 'auto' } = req.body
      if (!name) return res.status(400).json({ success: false, message: 'Project name is required' })

      const docText = await parseDocument(req.body)
      if (!docText || docText.trim().length < 20)
        return res.status(400).json({ success: false, message: 'Document content too short or empty' })

      if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ success: false, message: 'No LLM key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' })
      }

      // Build the agent roster for the prompt
      const agentRoster = ALL_AGENT_TYPES
        .map(t => `- ${t.replace(/_/g, ' ')} (type: ${t})`)
        .join('\n')

      // Ask LLM (as PM) to first select relevant agents, then create tasks only for those
      const llm = await callLLM({
        preferred: llm_provider,
        anthropicModel: 'claude-opus-4-5',
        maxTokens: 4096,
        userPrompt: `You are a senior Project Manager analyzing a project document. Your first job is to decide WHICH agents from the roster are actually needed for this project — not all projects need every agent. Then create specific tasks only for the selected agents.

PROJECT NAME: ${name}

DOCUMENT:
${docText.slice(0, 8000)}

FULL AGENT ROSTER (pick only what's relevant):
${agentRoster}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "project_description": "2-3 sentence summary of the project",
  "selected_agents": ["business_analyst", "uiux_designer"],
  "selection_reasoning": "Brief note on why these agents were chosen and others were skipped",
  "tasks": [
    {
      "agent_type": "business_analyst",
      "title": "Specific task title",
      "description": "Detailed description of what this agent should do",
      "priority": "high"
    }
  ]
}

Rules:
- selected_agents must only include agent types that are genuinely needed for this project
- Create 2-4 tasks per selected agent type, specific to the document content
- Priority must be one of: low, medium, high, urgent
- agent_type in tasks must exactly match the type strings in the roster and be in selected_agents
- DO NOT include agents that have no meaningful role in this project`,
      })

      let parsed
      try {
        const raw = (llm.text || '').trim()
        parsed = JSON.parse(raw)
      } catch {
        return res.status(500).json({ success: false, message: 'Claude returned invalid JSON. Try again.' })
      }

      const now = new Date().toISOString()
      const projectId = uuidv4()

      // Ensure notes column exists (migration)
      try {
        db.exec('ALTER TABLE tasks ADD COLUMN notes TEXT')
      } catch { /* already exists */ }

      // Ensure phase column exists (migration)
      try {
        db.exec('ALTER TABLE tasks ADD COLUMN phase INTEGER DEFAULT 1')
      } catch { /* already exists */ }

      // Create the project
      db.prepare(
        'INSERT INTO projects (id, name, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(projectId, name, parsed.project_description || docText.slice(0, 300), status, priority, now, now)

      // Get all agents from DB
      const agentsByType = {}
      db.prepare('SELECT * FROM agents').all().forEach(a => { agentsByType[a.type] = a })

      // Create tasks with phase info
      const taskIds = []
      let positionCounter = 0

      for (const phaseInfo of AGENT_PHASES) {
        const phaseTasks = (parsed.tasks || []).filter(t => phaseInfo.types.includes(t.agent_type))

        for (const task of phaseTasks) {
          const agent = agentsByType[task.agent_type]
          if (!agent) continue

          const taskId = uuidv4()
          db.prepare(
            `INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_agent, created_at, updated_at, position, phase)
             VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?)`
          ).run(taskId, projectId, task.title, task.description, task.priority || 'medium', agent.id, now, now, positionCounter++, phaseInfo.phase)

          taskIds.push(taskId)
        }
      }

      const selectedAgents = parsed.selected_agents || ALL_AGENT_TYPES
      const usedPhases = [...new Set(
        taskIds.length > 0
          ? db.prepare(`SELECT DISTINCT phase FROM tasks WHERE project_id = ?`).all(projectId).map(r => r.phase)
          : []
      )]

      res.json({
        success: true,
        data: {
          project_id: projectId,
          project_name: name,
          tasks_created: taskIds.length,
          phases: usedPhases.length,
          agents_selected: selectedAgents,
          agents_skipped: ALL_AGENT_TYPES.filter(a => !selectedAgents.includes(a)),
          selection_reasoning: parsed.selection_reasoning || '',
          message: `Project created with ${taskIds.length} tasks for ${selectedAgents.length} agents. Ready to execute.`,
        },
      })

    } catch (err) {
      console.error('[ingest]', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }
}
