const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  // GET / — filter by project_id AND assigned_agent, include agent name
  router.get('/', authenticate, (req, res) => {
    try {
      const { project_id, assigned_agent } = req.query;
      let sql = `
        SELECT t.*, u.name as assigned_to_name, p.name as project_name, a.name as agent_name, a.type as agent_type
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN agents a ON t.assigned_agent = a.id
        WHERE 1=1
      `;
      const params = [];

      if (project_id) {
        sql += ' AND t.project_id = ?';
        params.push(project_id);
      }
      if (assigned_agent) {
        sql += ' AND t.assigned_agent = ?';
        params.push(assigned_agent);
      }

      sql += ' ORDER BY t.status, t.position';

      const tasks = db.prepare(sql).all(...params);
      res.json({ success: true, data: tasks });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST / — accept assigned_agent in body
  router.post('/', authenticate, (req, res) => {
    try {
      const { project_id, title, description, status, priority, assigned_to, assigned_agent } = req.body;
      if (!project_id || !title) {
        return res.status(400).json({ success: false, message: 'project_id and title required' });
      }

      const maxPos = db.prepare('SELECT MAX(position) as maxPos FROM tasks WHERE project_id = ? AND status = ?').get(project_id, status || 'todo');
      const position = (maxPos.maxPos ?? -1) + 1;

      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to, assigned_agent, created_by, created_at, updated_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, project_id, title, description || '', status || 'todo', priority || 'medium', assigned_to || null, assigned_agent || null, req.user.id, now, now, position);

      const task = db.prepare(`
        SELECT t.*, p.name as project_name, a.name as agent_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN agents a ON t.assigned_agent = a.id
        WHERE t.id = ?
      `).get(id);

      res.status(201).json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PUT /:id — accept assigned_agent
  router.put('/:id', authenticate, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const { title, description, status, priority, assigned_to, assigned_agent, position } = req.body;
      const now = new Date().toISOString();
      db.prepare(
        'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, assigned_agent = ?, updated_at = ?, position = ? WHERE id = ?'
      ).run(
        title || existing.title,
        description !== undefined ? description : existing.description,
        status || existing.status,
        priority || existing.priority,
        assigned_to !== undefined ? assigned_to : existing.assigned_to,
        assigned_agent !== undefined ? assigned_agent : existing.assigned_agent,
        now,
        position !== undefined ? position : existing.position,
        req.params.id
      );

      const task = db.prepare(`
        SELECT t.*, p.name as project_name, a.name as agent_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN agents a ON t.assigned_agent = a.id
        WHERE t.id = ?
      `).get(req.params.id);

      res.json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PUT /:id/move — move between kanban columns
  router.put('/:id/move', authenticate, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const { status, position } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'Status required for move' });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE tasks SET status = ?, position = ?, updated_at = ? WHERE id = ?').run(
        status,
        position !== undefined ? position : 0,
        now,
        req.params.id
      );

      const task = db.prepare(`
        SELECT t.*, p.name as project_name, a.name as agent_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN agents a ON t.assigned_agent = a.id
        WHERE t.id = ?
      `).get(req.params.id);

      res.json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PUT /:id/assign-agent — assign agent to task
  router.put('/:id/assign-agent', authenticate, (req, res) => {
    try {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const { agent_id } = req.body;
      if (!agent_id) {
        return res.status(400).json({ success: false, message: 'agent_id is required' });
      }

      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const now = new Date().toISOString();

      // Update task with assigned agent
      db.prepare('UPDATE tasks SET assigned_agent = ?, updated_at = ? WHERE id = ?').run(agent_id, now, req.params.id);

      // Update agent: status=working, current_task_id=task.id, last_active=now
      db.prepare('UPDATE agents SET status = ?, current_task_id = ?, last_active = ? WHERE id = ?').run(
        'working', req.params.id, now, agent_id
      );

      // Log the assignment to agent_logs
      const logId = uuidv4();
      db.prepare(
        'INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(logId, agent_id, agent.type, 'task_assigned', `Agent "${agent.name}" assigned to task "${task.title}"`, task.project_id, req.params.id, now);

      const updated = db.prepare(`
        SELECT t.*, p.name as project_name, a.name as agent_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN agents a ON t.assigned_agent = a.id
        WHERE t.id = ?
      `).get(req.params.id);

      res.json({ success: true, data: updated, message: `Agent "${agent.name}" assigned to task` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // DELETE /:id
  router.delete('/:id', authenticate, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // If task had an assigned agent, clear agent's current_task_id if it points to this task
      if (existing.assigned_agent) {
        const agent = db.prepare('SELECT * FROM agents WHERE id = ? AND current_task_id = ?').get(existing.assigned_agent, req.params.id);
        if (agent) {
          db.prepare('UPDATE agents SET status = ?, current_task_id = NULL WHERE id = ?').run('idle', agent.id);
        }
      }

      db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Task deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
