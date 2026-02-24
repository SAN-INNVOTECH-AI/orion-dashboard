const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  // GET / — list all agents with current task info
  router.get('/', authenticate, (req, res) => {
    try {
      const agents = db.prepare(`
        SELECT a.*, t.title as current_task_title, t.project_id as current_project_id
        FROM agents a
        LEFT JOIN tasks t ON a.current_task_id = t.id
        ORDER BY a.name
      `).all();

      // Enrich each agent with total actions count
      const enriched = agents.map((agent) => {
        const totalActions = db.prepare(
          'SELECT COUNT(*) as count FROM agent_logs WHERE agent_id = ?'
        ).get(agent.id).count;

        const assignedTasksCount = db.prepare(
          'SELECT COUNT(*) as count FROM tasks WHERE assigned_agent = ?'
        ).get(agent.id).count;

        return { ...agent, totalActions, assignedTasksCount };
      });

      res.json({ success: true, data: enriched });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /:id — agent detail + assigned tasks + recent logs
  router.get('/:id', authenticate, (req, res) => {
    try {
      const agent = db.prepare(`
        SELECT a.*, t.title as current_task_title, t.project_id as current_project_id
        FROM agents a
        LEFT JOIN tasks t ON a.current_task_id = t.id
        WHERE a.id = ?
      `).get(req.params.id);

      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const assignedTasks = db.prepare(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.assigned_agent = ?
        ORDER BY t.updated_at DESC
      `).all(req.params.id);

      const recentLogs = db.prepare(`
        SELECT al.*, p.name as project_name
        FROM agent_logs al
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE al.agent_id = ?
        ORDER BY al.created_at DESC
        LIMIT 20
      `).all(req.params.id);

      res.json({
        success: true,
        data: {
          ...agent,
          assignedTasks,
          recentLogs,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PUT /:id/status — update agent status (admin only)
  router.put('/:id/status', authenticate, requireRole('admin'), (req, res) => {
    try {
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const { status } = req.body;
      if (!status || !['idle', 'working', 'completed', 'error'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Valid status required (idle, working, completed, error)' });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE agents SET status = ?, last_active = ? WHERE id = ?').run(status, now, req.params.id);

      // If setting to idle or completed, clear current_task_id
      if (status === 'idle' || status === 'completed') {
        db.prepare('UPDATE agents SET current_task_id = NULL WHERE id = ?').run(req.params.id);
      }

      const updated = db.prepare(`
        SELECT a.*, t.title as current_task_title
        FROM agents a
        LEFT JOIN tasks t ON a.current_task_id = t.id
        WHERE a.id = ?
      `).get(req.params.id);

      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
