require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initializeDB, seedData } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

const db = initializeDB();
seedData(db);

// Routes
app.use('/auth', require('./routes/auth')(db));
app.use('/projects', require('./routes/projects')(db));
app.use('/tasks', require('./routes/tasks')(db));
app.use('/agents', require('./routes/agents')(db));
app.use('/agent-logs', require('./routes/agent-logs')(db));
app.use('/analytics', require('./routes/analytics')(db));
app.use('/users', require('./routes/users')(db));
app.use('/pm-agent', require('./pm-agent')(db));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// SSE Live Progress endpoint
app.get('/live-progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendUpdate = () => {
    const agents = db.prepare(`
      SELECT a.*, t.title as current_task_title
      FROM agents a
      LEFT JOIN tasks t ON a.current_task_id = t.id
    `).all();
    res.write(`data: ${JSON.stringify({ type: 'agent_update', agents })}\n\n`);
  };

  sendUpdate();
  const interval = setInterval(sendUpdate, 3000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Orion server running on port ${PORT}`));
