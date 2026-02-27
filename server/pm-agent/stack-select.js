const { callLLM } = require('./llm')

module.exports = function stackSelectRoute(db) {
  return async function (req, res) {
    try {
      const { project_id, llm_provider = 'auto' } = req.body
      if (!project_id) return res.status(400).json({ success: false, message: 'project_id is required' })

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(project_id)
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' })

      const tasks = db.prepare(`
        SELECT t.title, t.description, a.type as agent_type
        FROM tasks t
        LEFT JOIN agents a ON t.assigned_agent = a.id
        WHERE t.project_id = ?
        ORDER BY COALESCE(t.phase, 1), t.position
      `).all(project_id)

      if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ success: false, message: 'No LLM key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.' })
      }

      const taskContext = tasks
        .slice(0, 40)
        .map((t, i) => `${i + 1}. [${t.agent_type || 'unknown'}] ${t.title}${t.description ? ` - ${t.description.slice(0, 120)}` : ''}`)
        .join('\n')

      const llm = await callLLM({
        preferred: llm_provider,
        anthropicModel: 'claude-haiku-4-5',
        maxTokens: 1400,
        userPrompt: `You are a principal architect choosing the right tech stack for delivery speed + scalability.

Project: ${project.name}
Description: ${project.description || 'N/A'}
Task Context:\n${taskContext || 'No tasks available'}

Return ONLY valid JSON:
{
  "recommended_stack": {
    "frontend": "...",
    "backend": "...",
    "database": "...",
    "auth": "...",
    "infra": "..."
  },
  "fallback_stacks": [
    {"name":"...", "when_to_use":"..."},
    {"name":"...", "when_to_use":"..."}
  ],
  "reasoning": "short practical reason",
  "risks": ["...", "..."],
  "execution_blueprint": ["step 1", "step 2", "step 3"]
}`,
      })

      let parsed
      try {
        parsed = JSON.parse((llm.text || '').trim())
      } catch {
        return res.status(500).json({ success: false, message: 'Stack strategist returned invalid JSON. Try again.' })
      }

      try { db.exec('ALTER TABLE projects ADD COLUMN stack_decision_json TEXT') } catch {}
      try { db.exec('ALTER TABLE projects ADD COLUMN stack_decided_at TEXT') } catch {}

      const now = new Date().toISOString()
      db.prepare('UPDATE projects SET stack_decision_json = ?, stack_decided_at = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(parsed), now, now, project_id)

      res.json({ success: true, data: parsed })
    } catch (err) {
      console.error('[stack-select]', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }
}
