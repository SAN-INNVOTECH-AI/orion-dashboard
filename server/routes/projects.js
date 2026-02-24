const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  router.get('/', authenticate, (req, res) => {
    try {
      const { status, priority } = req.query;
      let sql = 'SELECT p.*, u.name as assigned_to_name FROM projects p LEFT JOIN users u ON p.assigned_to = u.id WHERE 1=1';
      const params = [];

      if (status) {
        sql += ' AND p.status = ?';
        params.push(status);
      }
      if (priority) {
        sql += ' AND p.priority = ?';
        params.push(priority);
      }
      sql += ' ORDER BY p.updated_at DESC';

      const projects = db.prepare(sql).all(...params);
      res.json({ success: true, data: projects });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/', authenticate, (req, res) => {
    try {
      const { name, description, status, priority, assigned_to } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Project name required' });
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO projects (id, name, description, status, priority, assigned_to, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, name, description || '', status || 'planning', priority || 'medium', assigned_to || null, req.user.id, now, now);

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/:id', authenticate, (req, res) => {
    try {
      const project = db.prepare(
        'SELECT p.*, u.name as assigned_to_name FROM projects p LEFT JOIN users u ON p.assigned_to = u.id WHERE p.id = ?'
      ).get(req.params.id);

      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      const tasks = db.prepare(
        'SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.project_id = ? ORDER BY t.position'
      ).all(req.params.id);

      res.json({ success: true, data: { ...project, tasks } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/:id', authenticate, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      const { name, description, status, priority, assigned_to } = req.body;
      const now = new Date().toISOString();
      db.prepare(
        'UPDATE projects SET name = ?, description = ?, status = ?, priority = ?, assigned_to = ?, updated_at = ? WHERE id = ?'
      ).run(
        name || existing.name,
        description !== undefined ? description : existing.description,
        status || existing.status,
        priority || existing.priority,
        assigned_to !== undefined ? assigned_to : existing.assigned_to,
        now,
        req.params.id
      );

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: project });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/:id', authenticate, (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
