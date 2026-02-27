require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initializeDB, seedData } = require('./db');
const ingestRoute = require('./pm-agent/ingest');
const executeRoute = require('./pm-agent/execute');
const stackSelectRoute = require('./pm-agent/stack-select');
const { authenticate } = require('./middleware/auth');
const { callLLM } = require('./pm-agent/llm');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // large for base64 docs
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const db = initializeDB();
seedData(db);

// Shared SSE client registry — used by execute route to broadcast
const sseClients = new Set();

async function checkLLMHealth() {
  try {
    const llm = await callLLM({
      anthropicModel: 'claude-haiku-4-5',
      maxTokens: 8,
      userPrompt: 'Reply with OK only.',
    });

    return {
      ok: true,
      reason: 'validated',
      message: 'LLM reachable',
      provider: llm.provider,
      model: llm.model,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err?.response?.data?.error?.type || err?.error?.type || 'llm_check_failed',
      status: err?.status || err?.response?.status || 500,
      message: err?.response?.data?.error?.message || err?.error?.message || err.message || 'Unknown LLM error',
      request_id: err?.request_id || err?.error?.request_id || null,
    };
  }
}

// Routes
app.use('/auth',       require('./routes/auth')(db));
app.use('/projects',   require('./routes/projects')(db));
app.use('/tasks',      require('./routes/tasks')(db));
app.use('/agents',     require('./routes/agents')(db));
app.use('/agent-logs', require('./routes/agent-logs')(db));
app.use('/analytics',  require('./routes/analytics')(db));
app.use('/users',      require('./routes/users')(db));
app.use('/pm-agent',   require('./pm-agent')(db));

// Document ingest
app.post('/pm-agent/ingest', authenticate, ingestRoute(db));

// AI stack strategist
app.post('/pm-agent/stack-select', authenticate, stackSelectRoute(db));

// Sequential agent execution
app.post('/pm-agent/execute/:project_id', authenticate, executeRoute(db, sseClients));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// LLM Health: validates primary Claude and OpenAI codex fallback path
app.get('/health/llm', async (req, res) => {
  const result = await checkLLMHealth();
  const status = result.ok ? 200 : (result.status || 500);
  res.status(status).json({
    status: result.ok ? 'ok' : 'error',
    provider: result.provider || 'unknown',
    model: result.model || 'unknown',
    ...result,
    timestamp: new Date().toISOString(),
  });
});

// SSE Live Progress — broadcasts agent status updates + execution events
app.get('/live-progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type':                'text/event-stream',
    'Cache-Control':               'no-cache',
    'Connection':                  'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Register this client
  sseClients.add(res);

  // Initial agent status
  const agents = db.prepare(`
    SELECT a.*, t.title as current_task_title
    FROM agents a LEFT JOIN tasks t ON a.current_task_id = t.id
  `).all();
  res.write(`data: ${JSON.stringify({ type: 'agent_update', agents })}\n\n`);

  // Heartbeat every 3s to keep connection alive and update agent status
  const interval = setInterval(() => {
    try {
      const agents = db.prepare(`
        SELECT a.*, t.title as current_task_title
        FROM agents a LEFT JOIN tasks t ON a.current_task_id = t.id
      `).all();
      res.write(`data: ${JSON.stringify({ type: 'agent_update', agents })}\n\n`);
    } catch {}
  }, 3000);

  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Orion server running on port ${PORT}`);

  const llm = await checkLLMHealth();
  if (!llm.ok) {
    console.warn(`[startup][llm] WARNING: ${llm.message}`);
  } else {
    console.log(`[startup][llm] ${llm.provider} model ${llm.model} validated.`);
  }
});
