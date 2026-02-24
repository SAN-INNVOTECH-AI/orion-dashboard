const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

module.exports = function (db) {
  // POST /run — Run PM Agent analysis
  router.post('/run', authenticate, (req, res) => {
    try {
      const now = new Date().toISOString();
      const THREE_DAYS_AGO = new Date(Date.now() - 3 * 86400000).toISOString();

      const report = [];
      const issues = [];
      const tasksCreated = [];
      const assignments = [];

      // Helper: find agent by type
      function getAgentByType(type) {
        return db.prepare('SELECT * FROM agents WHERE type = ?').get(type);
      }

      // Helper: determine which agent type should handle an issue category
      function resolveAgentType(category) {
        const mapping = {
          'code': 'web_developer',
          'dev': 'web_developer',
          'testing': 'qa_engineer',
          'test': 'qa_engineer',
          'docs': 'training_docs',
          'documentation': 'training_docs',
          'security': 'security_specialist',
          'performance': 'performance_optimizer',
        };
        return mapping[category] || 'project_manager';
      }

      // Helper: create task and assign to agent
      function createAndAssign(projectId, title, description, category) {
        const agentType = resolveAgentType(category);
        const agent = getAgentByType(agentType);
        if (!agent) return null;

        const taskId = uuidv4();
        const maxPos = db.prepare("SELECT MAX(position) as maxPos FROM tasks WHERE project_id = ? AND status = 'todo'").get(projectId);
        const position = (maxPos.maxPos ?? -1) + 1;

        db.prepare(
          'INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to, assigned_agent, created_by, created_at, updated_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(taskId, projectId, title, description, 'todo', 'medium', null, agent.id, null, now, now, position);

        // Update agent status
        db.prepare('UPDATE agents SET status = ?, current_task_id = ?, last_active = ? WHERE id = ?').run(
          'working', taskId, now, agent.id
        );

        // Log the assignment
        const logId = uuidv4();
        db.prepare(
          'INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(logId, agent.id, agent.type, 'pm_auto_assign', `PM Agent auto-assigned "${title}" to ${agent.name}`, projectId, taskId, now);

        tasksCreated.push({ id: taskId, title });
        assignments.push({ task: title, agent: agent.name, agentType: agent.type });

        return { taskId, agent };
      }

      // ── Analysis Step 1: Get all projects and tasks ──
      const projects = db.prepare('SELECT * FROM projects').all();
      const allTasks = db.prepare('SELECT * FROM tasks').all();

      report.push(`Analyzed ${projects.length} projects and ${allTasks.length} tasks.`);

      // ── Analysis Step 2: Detect issues ──

      // Issue type 1: Stale tasks (updated_at > 3 days ago, not done)
      const staleTasks = db.prepare(
        "SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.status != 'done' AND t.updated_at < ?"
      ).all(THREE_DAYS_AGO);

      staleTasks.forEach((task) => {
        const issue = {
          type: 'stale_task',
          description: `Task "${task.title}" in project "${task.project_name}" has not been updated for over 3 days`,
          taskId: task.id,
          projectId: task.project_id,
        };
        issues.push(issue);
        report.push(`[STALE] ${issue.description}`);

        createAndAssign(
          task.project_id,
          `Follow up on stale task: ${task.title}`,
          `The task "${task.title}" has not been updated since ${task.updated_at}. Review progress and unblock if needed.`,
          'code'
        );
      });

      // Issue type 2: Projects with 0 tasks
      projects.forEach((project) => {
        const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?').get(project.id).count;
        if (taskCount === 0) {
          const issue = {
            type: 'empty_project',
            description: `Project "${project.name}" has no tasks defined`,
            projectId: project.id,
          };
          issues.push(issue);
          report.push(`[EMPTY PROJECT] ${issue.description}`);

          createAndAssign(
            project.id,
            `Define initial tasks for ${project.name}`,
            `Project "${project.name}" has no tasks. Break down the project scope into actionable tasks.`,
            'docs'
          );
        }
      });

      // Issue type 3: Tasks with no assigned_agent (and not done)
      const unassignedTasks = db.prepare(
        "SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.assigned_agent IS NULL AND t.status != 'done'"
      ).all();

      unassignedTasks.forEach((task) => {
        const issue = {
          type: 'unassigned_task',
          description: `Task "${task.title}" in "${task.project_name}" has no assigned agent`,
          taskId: task.id,
          projectId: task.project_id,
        };
        issues.push(issue);
        report.push(`[UNASSIGNED] ${issue.description}`);

        // Instead of creating a new task, assign the existing task to an appropriate agent
        // Determine category based on task title keywords
        let category = 'code';
        const titleLower = task.title.toLowerCase();
        if (titleLower.includes('test') || titleLower.includes('qa')) category = 'testing';
        else if (titleLower.includes('doc') || titleLower.includes('document')) category = 'docs';
        else if (titleLower.includes('secur') || titleLower.includes('vulnerab')) category = 'security';
        else if (titleLower.includes('perf') || titleLower.includes('optim')) category = 'performance';

        const agentType = resolveAgentType(category);
        const agent = getAgentByType(agentType);
        if (agent) {
          db.prepare('UPDATE tasks SET assigned_agent = ?, updated_at = ? WHERE id = ?').run(agent.id, now, task.id);
          db.prepare('UPDATE agents SET status = ?, current_task_id = ?, last_active = ? WHERE id = ?').run('working', task.id, now, agent.id);

          const logId = uuidv4();
          db.prepare(
            'INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(logId, agent.id, agent.type, 'pm_auto_assign', `PM Agent auto-assigned unassigned task "${task.title}" to ${agent.name}`, task.project_id, task.id, now);

          assignments.push({ task: task.title, agent: agent.name, agentType: agent.type });
        }
      });

      // Issue type 4: Unbalanced kanban columns (project has >5x tasks in one column vs others)
      projects.forEach((project) => {
        const columns = db.prepare(
          'SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status'
        ).all(project.id);

        if (columns.length > 1) {
          const counts = columns.map((c) => c.count);
          const max = Math.max(...counts);
          const min = Math.min(...counts);

          if (max > 0 && min > 0 && max / min > 5) {
            const heavyCol = columns.find((c) => c.count === max);
            const issue = {
              type: 'unbalanced_kanban',
              description: `Project "${project.name}" has unbalanced columns: "${heavyCol.status}" has ${max} tasks while other columns have as few as ${min}`,
              projectId: project.id,
            };
            issues.push(issue);
            report.push(`[UNBALANCED] ${issue.description}`);

            createAndAssign(
              project.id,
              `Rebalance workload in ${project.name}`,
              `The "${heavyCol.status}" column has ${max} tasks while other columns have only ${min}. Review task distribution and priorities.`,
              'code'
            );
          }
        }
      });

      // Log the PM Agent run itself
      const pmAgent = getAgentByType('project_manager');
      if (pmAgent) {
        const runLogId = uuidv4();
        db.prepare(
          'INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          runLogId,
          pmAgent.id,
          'project_manager',
          'pm_analysis_run',
          JSON.stringify({
            analyzed: projects.length,
            issues_found: issues.length,
            tasks_created: tasksCreated.length,
            assignments: assignments.length,
          }),
          null,
          null,
          now
        );
      }

      res.json({
        success: true,
        data: {
          analyzed: projects.length,
          issues_found: issues.length,
          tasks_created: tasksCreated.length,
          assignments,
          report,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /status — return last PM agent run summary from agent_logs
  router.get('/status', authenticate, (req, res) => {
    try {
      const lastRun = db.prepare(`
        SELECT al.*, a.name as agent_name
        FROM agent_logs al
        LEFT JOIN agents a ON al.agent_id = a.id
        WHERE al.agent_type = 'project_manager' AND al.action = 'pm_analysis_run'
        ORDER BY al.created_at DESC
        LIMIT 1
      `).get();

      if (!lastRun) {
        return res.json({
          success: true,
          data: {
            lastRun: null,
            message: 'PM Agent has not been run yet',
          },
        });
      }

      let summary = {};
      try {
        summary = JSON.parse(lastRun.details);
      } catch {
        summary = { details: lastRun.details };
      }

      // Get recent PM agent logs
      const recentLogs = db.prepare(`
        SELECT al.*, a.name as agent_name, p.name as project_name
        FROM agent_logs al
        LEFT JOIN agents a ON al.agent_id = a.id
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE al.agent_type = 'project_manager'
        ORDER BY al.created_at DESC
        LIMIT 20
      `).all();

      res.json({
        success: true,
        data: {
          lastRun: lastRun.created_at,
          summary,
          recentLogs,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
