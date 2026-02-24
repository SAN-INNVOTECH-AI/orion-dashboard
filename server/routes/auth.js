const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

module.exports = function (db) {
  router.post('/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token,
        refreshToken,
        expiresIn: 86400,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/refresh', (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const tokenPayload = { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      const newRefreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.json({ success: true, token, refreshToken: newRefreshToken, expiresIn: 86400 });
    } catch {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
  });

  return router;
};
