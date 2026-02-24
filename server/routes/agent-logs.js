const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  // GET / — list recent logs, optional filter by agent_id
  router.get('/', authenticate, (req, res) => {
    try {
      const { agent_id } = req.query;
      let sql = `
        SELECT al.*, a.name as agent_name, p.name as project_name
        FROM agent_logs al
        LEFT JOIN agents a ON al.agent_id = a.id
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE 1=1
      `;
      const params = [];

      if (agent_id) {
        sql += ' AND al.agent_id = ?';
        params.push(agent_id);
      }

      sql += ' ORDER BY al.created_at DESC LIMIT 100';

      const logs = db.prepare(sql).all(...params);
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST / — create log entry
  router.post('/', authenticate, (req, res) => {
    try {
      const { agent_id, agent_type, action, details, project_id, task_id } = req.body;

      if (!agent_type || !action) {
        return res.status(400).json({ success: false, message: 'agent_type and action are required' });
      }

      const id = uuidv4();
      db.prepare(
        'INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, agent_id || null, agent_type, action, details || '', project_id || null, task_id || null);

      const log = db.prepare(`
        SELECT al.*, a.name as agent_name
        FROM agent_logs al
        LEFT JOIN agents a ON al.agent_id = a.id
        WHERE al.id = ?
      `).get(id);

      res.status(201).json({ success: true, data: log });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
