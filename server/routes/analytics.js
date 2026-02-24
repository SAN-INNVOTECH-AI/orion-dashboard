const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  router.get('/', authenticate, (req, res) => {
    try {
      const projectsByStatus = db.prepare(
        'SELECT status, COUNT(*) as count FROM projects GROUP BY status'
      ).all();

      const tasksByPriority = db.prepare(
        'SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority'
      ).all();

      const tasksByStatus = db.prepare(
        'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
      ).all();

      const aiUsageByModel = db.prepare(
        'SELECT model, SUM(tokens_input) as total_input, SUM(tokens_output) as total_output, SUM(cost_usd) as total_cost, COUNT(*) as requests FROM ai_usage GROUP BY model'
      ).all();

      const aiCostTrend = db.prepare(
        "SELECT date(created_at) as date, SUM(cost_usd) as cost, SUM(tokens_input + tokens_output) as tokens FROM ai_usage GROUP BY date(created_at) ORDER BY date"
      ).all();

      const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
      const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
      const totalCost = db.prepare('SELECT SUM(cost_usd) as total FROM ai_usage').get().total || 0;

      // Agent utilization: tasks per agent
      const agentUtilization = db.prepare(`
        SELECT a.id, a.name, a.type, a.status,
          COUNT(t.id) as assigned_tasks_count,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as active_tasks
        FROM agents a
        LEFT JOIN tasks t ON t.assigned_agent = a.id
        GROUP BY a.id
        ORDER BY assigned_tasks_count DESC
      `).all();

      const totalAgents = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
      const activeAgents = db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'working'").get().count;

      res.json({
        success: true,
        data: {
          projectsByStatus,
          tasksByPriority,
          tasksByStatus,
          aiUsageByModel,
          aiCostTrend,
          agentUtilization,
          summary: {
            totalProjects,
            totalTasks,
            totalCost: parseFloat(totalCost.toFixed(4)),
            totalAgents,
            activeAgents,
          },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
