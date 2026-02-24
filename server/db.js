const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'orion.db');

function initializeDB() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'project_manager', 'viewer')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'in_progress', 'review', 'completed', 'on_hold')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      assigned_to TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'working', 'completed', 'error')),
      current_task_id TEXT,
      last_active TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      assigned_to TEXT,
      assigned_agent TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      position INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (assigned_agent) REFERENCES agents(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      agent_type TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      project_id TEXT,
      task_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      endpoint TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function seedData(db) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  // ── Users ──
  const adminId = uuidv4();
  const pmId = uuidv4();
  const viewerId = uuidv4();

  const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(adminId, 'Admin User', 'admin', bcrypt.hashSync('admin', 10), 'admin');
  insertUser.run(pmId, 'Project Manager', 'pm', bcrypt.hashSync('manager123', 10), 'project_manager');
  insertUser.run(viewerId, 'Viewer User', 'viewer', bcrypt.hashSync('viewer123', 10), 'viewer');

  // ── Agents (all 17) ──
  const agentDefs = [
    { name: 'Project Manager Agent', type: 'project_manager', desc: 'Orchestrates project planning, monitors progress, and coordinates between teams' },
    { name: 'Business Analyst Agent', type: 'business_analyst', desc: 'Gathers requirements, analyzes business processes, and creates specifications' },
    { name: 'System Integrator Agent', type: 'system_integrator', desc: 'Manages system integrations, APIs, and data flow between services' },
    { name: 'UI/UX Designer Agent', type: 'uiux_designer', desc: 'Creates wireframes, prototypes, and design systems for user interfaces' },
    { name: 'Content & Copywriting Agent', type: 'content_copywriter', desc: 'Generates marketing copy, documentation content, and user-facing text' },
    { name: 'Security Specialist Agent', type: 'security_specialist', desc: 'Performs security audits, vulnerability assessments, and compliance checks' },
    { name: 'Database Administrator Agent', type: 'db_admin', desc: 'Manages database schemas, optimizes queries, and handles data migrations' },
    { name: 'Web Developer Agent', type: 'web_developer', desc: 'Builds and maintains web applications, frontend and backend components' },
    { name: 'Mobile Developer Agent', type: 'mobile_developer', desc: 'Develops mobile applications for iOS and Android platforms' },
    { name: 'Performance Optimization Agent', type: 'performance_optimizer', desc: 'Analyzes and improves application performance, load times, and resource usage' },
    { name: 'QA Engineer Agent', type: 'qa_engineer', desc: 'Designs test plans, executes automated tests, and tracks quality metrics' },
    { name: 'SEO & Digital Marketing Agent', type: 'seo_marketing', desc: 'Optimizes search engine rankings, manages digital campaigns, and tracks analytics' },
    { name: 'Compliance & Legal Agent', type: 'compliance_legal', desc: 'Ensures regulatory compliance, reviews legal requirements, and manages policies' },
    { name: 'DevOps Engineer Agent', type: 'devops_engineer', desc: 'Manages CI/CD pipelines, infrastructure, and deployment automation' },
    { name: 'Training & Documentation Agent', type: 'training_docs', desc: 'Creates training materials, user guides, and technical documentation' },
    { name: 'Maintenance & Support Agent', type: 'maintenance_support', desc: 'Handles bug fixes, maintenance tasks, and customer support escalations' },
    { name: 'Video Generation Agent', type: 'video_generation', desc: 'Creates and edits video content, animations, and multimedia presentations' },
  ];

  const agentIds = {};
  const insertAgent = db.prepare('INSERT INTO agents (id, name, type, description, status, current_task_id, last_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  agentDefs.forEach((a) => {
    const id = uuidv4();
    agentIds[a.type] = id;
    const createdAt = new Date(Date.now() - 30 * 86400000).toISOString();
    insertAgent.run(id, a.name, a.type, a.desc, 'idle', null, null, createdAt);
  });

  // ── Projects ──
  const projectIds = [];
  const insertProject = db.prepare('INSERT INTO projects (id, name, description, status, priority, assigned_to, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  const projectData = [
    { name: 'Orion Core Platform', desc: 'Main platform development with AI integration', status: 'in_progress', priority: 'urgent', assigned: pmId },
    { name: 'Mobile App Redesign', desc: 'Complete redesign of the mobile application UI/UX', status: 'planning', priority: 'high', assigned: pmId },
    { name: 'Data Pipeline v2', desc: 'Rebuild data ingestion and processing pipeline', status: 'review', priority: 'high', assigned: pmId },
    { name: 'Security Audit Q1', desc: 'Quarterly security audit and vulnerability assessment', status: 'completed', priority: 'medium', assigned: adminId },
    { name: 'API Gateway Migration', desc: 'Migrate legacy REST endpoints to new gateway', status: 'on_hold', priority: 'low', assigned: pmId },
  ];

  projectData.forEach((p) => {
    const id = uuidv4();
    projectIds.push(id);
    const date = new Date(Date.now() - Math.random() * 30 * 86400000).toISOString();
    insertProject.run(id, p.name, p.desc, p.status, p.priority, p.assigned, p.assigned === adminId ? adminId : pmId, date, date);
  });

  // ── Tasks (15 total, some with assigned_agent) ──
  const insertTask = db.prepare(
    'INSERT INTO tasks (id, project_id, title, description, status, priority, assigned_to, assigned_agent, created_by, created_at, updated_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const taskData = [
    { proj: 0, title: 'Set up CI/CD pipeline', status: 'done', priority: 'high', assigned: pmId, agent: 'devops_engineer', pos: 0 },
    { proj: 0, title: 'Implement authentication module', status: 'in_progress', priority: 'urgent', assigned: pmId, agent: 'web_developer', pos: 1 },
    { proj: 0, title: 'Design database schema', status: 'done', priority: 'high', assigned: adminId, agent: 'db_admin', pos: 2 },
    { proj: 0, title: 'Build REST API endpoints', status: 'in_progress', priority: 'high', assigned: pmId, agent: 'web_developer', pos: 0 },
    { proj: 0, title: 'Write unit tests', status: 'todo', priority: 'medium', assigned: null, agent: null, pos: 0 },
    { proj: 1, title: 'Create wireframes', status: 'todo', priority: 'high', assigned: pmId, agent: 'uiux_designer', pos: 0 },
    { proj: 1, title: 'Design system setup', status: 'todo', priority: 'medium', assigned: null, agent: null, pos: 1 },
    { proj: 1, title: 'Prototype navigation flow', status: 'review', priority: 'high', assigned: pmId, agent: 'uiux_designer', pos: 0 },
    { proj: 2, title: 'Benchmark current pipeline', status: 'done', priority: 'medium', assigned: pmId, agent: 'performance_optimizer', pos: 0 },
    { proj: 2, title: 'Design new ingestion layer', status: 'review', priority: 'high', assigned: pmId, agent: 'system_integrator', pos: 1 },
    { proj: 2, title: 'Implement streaming processor', status: 'in_progress', priority: 'urgent', assigned: pmId, agent: 'web_developer', pos: 0 },
    { proj: 3, title: 'Run OWASP scan', status: 'done', priority: 'high', assigned: adminId, agent: 'security_specialist', pos: 0 },
    { proj: 3, title: 'Patch critical vulnerabilities', status: 'done', priority: 'urgent', assigned: adminId, agent: 'security_specialist', pos: 1 },
    { proj: 4, title: 'Document current API endpoints', status: 'todo', priority: 'low', assigned: null, agent: 'training_docs', pos: 0 },
    { proj: 4, title: 'Plan migration strategy', status: 'todo', priority: 'medium', assigned: pmId, agent: null, pos: 1 },
  ];

  const taskIds = [];
  taskData.forEach((t) => {
    const id = uuidv4();
    taskIds.push(id);
    const date = new Date(Date.now() - Math.random() * 20 * 86400000).toISOString();
    const agentId = t.agent ? agentIds[t.agent] : null;
    insertTask.run(id, projectIds[t.proj], t.title, `Task: ${t.title}`, t.status, t.priority, t.assigned, agentId, pmId, date, date, t.pos);
  });

  // Set some agents to 'working' with current_task_id for active tasks
  const updateAgent = db.prepare('UPDATE agents SET status = ?, current_task_id = ?, last_active = ? WHERE id = ?');
  // web_developer is working on "Build REST API endpoints" (taskData index 3)
  updateAgent.run('working', taskIds[3], new Date().toISOString(), agentIds['web_developer']);
  // uiux_designer is working on "Prototype navigation flow" (taskData index 7 - review status)
  updateAgent.run('working', taskIds[7], new Date().toISOString(), agentIds['uiux_designer']);
  // system_integrator is working on "Design new ingestion layer" (taskData index 9)
  updateAgent.run('working', taskIds[9], new Date().toISOString(), agentIds['system_integrator']);

  // ── Agent Logs ──
  const insertLog = db.prepare('INSERT INTO agent_logs (id, agent_id, agent_type, action, details, project_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  const logData = [
    { agentType: 'project_manager', action: 'analyze_projects', details: 'Analyzed 5 projects, found 2 stale tasks', proj: projectIds[0], task: null },
    { agentType: 'project_manager', action: 'create_task', details: 'Created follow-up task for stalled review', proj: projectIds[2], task: taskIds[9] },
    { agentType: 'project_manager', action: 'detect_issue', details: 'Found unassigned tasks in Mobile App Redesign', proj: projectIds[1], task: null },
    { agentType: 'web_developer', action: 'review_pr', details: 'Reviewed PR #42 — 3 suggestions made', proj: projectIds[0], task: taskIds[3] },
    { agentType: 'qa_engineer', action: 'run_tests', details: 'Executed 127 test cases, 2 failures detected', proj: projectIds[0], task: taskIds[4] },
    { agentType: 'devops_engineer', action: 'deploy', details: 'Deployed CI/CD pipeline to staging environment', proj: projectIds[0], task: taskIds[0] },
    { agentType: 'security_specialist', action: 'scan_complete', details: 'OWASP scan completed, 3 medium vulnerabilities found', proj: projectIds[3], task: taskIds[11] },
    { agentType: 'db_admin', action: 'schema_review', details: 'Reviewed database schema, suggested 2 index optimizations', proj: projectIds[0], task: taskIds[2] },
    { agentType: 'uiux_designer', action: 'prototype_update', details: 'Updated navigation flow prototype with user feedback', proj: projectIds[1], task: taskIds[7] },
    { agentType: 'performance_optimizer', action: 'benchmark', details: 'Pipeline benchmark complete: 340ms avg latency', proj: projectIds[2], task: taskIds[8] },
  ];

  logData.forEach((l) => {
    const date = new Date(Date.now() - Math.random() * 10 * 86400000).toISOString();
    const agentId = agentIds[l.agentType] || null;
    insertLog.run(uuidv4(), agentId, l.agentType, l.action, l.details, l.proj, l.task, date);
  });

  // ── AI Usage (spread over 30 days) ──
  const insertUsage = db.prepare('INSERT INTO ai_usage (id, model, tokens_input, tokens_output, cost_usd, endpoint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const models = ['gpt-4', 'claude-3-opus', 'claude-3-sonnet', 'gpt-3.5-turbo'];
  const endpoints = ['/analyze', '/generate', '/review', '/summarize'];

  for (let i = 0; i < 30; i++) {
    const model = models[Math.floor(Math.random() * models.length)];
    const tokensIn = Math.floor(Math.random() * 5000) + 500;
    const tokensOut = Math.floor(Math.random() * 2000) + 200;
    const cost = parseFloat(((tokensIn * 0.00003 + tokensOut * 0.00006) * (model.includes('opus') ? 3 : 1)).toFixed(4));
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    // Spread over 30 days
    const date = new Date(Date.now() - (i * 86400000) - Math.random() * 86400000).toISOString();
    insertUsage.run(uuidv4(), model, tokensIn, tokensOut, cost, endpoint, date);
  }

  console.log('Database seeded with demo data (3 users, 17 agents, 5 projects, 15 tasks, logs, AI usage).');
}

module.exports = { initializeDB, seedData };
