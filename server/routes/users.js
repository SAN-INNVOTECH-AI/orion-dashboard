const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireRole } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  router.get('/', authenticate, requireRole('admin'), (req, res) => {
    try {
      const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/', authenticate, requireRole('admin'), (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Name, email, and password required' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }

      const id = uuidv4();
      const password_hash = bcrypt.hashSync(password, 10);
      db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
        id, name, email, password_hash, role || 'viewer'
      );

      const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const { name, email, password, role } = req.body;
      const password_hash = password ? bcrypt.hashSync(password, 10) : existing.password_hash;

      db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ?, role = ? WHERE id = ?').run(
        name || existing.name,
        email || existing.email,
        password_hash,
        role || existing.role,
        req.params.id
      );

      const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (existing.id === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
