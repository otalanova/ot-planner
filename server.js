const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Load .env (handles BOM, \r\n, quotes)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '');
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^\s*(\w+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Create tasks.md from template if it doesn't exist
const tasksPath = path.join(DATA_DIR, 'tasks.md');
const templatePath = path.join(DATA_DIR, 'tasks.template.md');
if (!fs.existsSync(tasksPath) && fs.existsSync(templatePath)) {
  fs.copyFileSync(templatePath, tasksPath);
}

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Get tasks
app.get('/api/tasks', (req, res) => {
  const filePath = path.join(DATA_DIR, 'tasks.md');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const tasks = parseTasksMd(content);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save tasks
app.post('/api/tasks', (req, res) => {
  const filePath = path.join(DATA_DIR, 'tasks.md');
  try {
    createDailyBackup();
    const md = buildTasksMd(req.body);
    fs.writeFileSync(filePath, md, 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Profiles ----------

const PROFILES = { personal: 'tasks.personal.md', demo: 'tasks.demo.md' };
let activeProfile = 'personal';

// Detect initial profile by checking which file matches tasks.md
try {
  const current = fs.readFileSync(tasksPath, 'utf-8');
  for (const [name, file] of Object.entries(PROFILES)) {
    const p = path.join(DATA_DIR, file);
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf-8') === current) {
      activeProfile = name;
      break;
    }
  }
} catch {}

app.get('/api/profile', (req, res) => {
  res.json({ active: activeProfile, profiles: Object.keys(PROFILES) });
});

app.post('/api/profile', (req, res) => {
  const { name } = req.body;
  if (!PROFILES[name]) return res.status(400).json({ error: 'Unknown profile' });
  if (name === activeProfile) return res.json({ ok: true });

  try {
    // Save current tasks.md back to active profile file
    const currentFile = path.join(DATA_DIR, PROFILES[activeProfile]);
    if (fs.existsSync(tasksPath)) {
      fs.copyFileSync(tasksPath, currentFile);
    }
    // Load new profile into tasks.md
    const newFile = path.join(DATA_DIR, PROFILES[name]);
    if (fs.existsSync(newFile)) {
      fs.copyFileSync(newFile, tasksPath);
    } else {
      fs.copyFileSync(templatePath, tasksPath);
    }
    activeProfile = name;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function createDailyBackup() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const backupPath = path.join(DATA_DIR, `${today}_tasks.md`);
  if (fs.existsSync(backupPath)) return; // one backup per day
  const source = path.join(DATA_DIR, 'tasks.md');
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, backupPath);
  }
}

// ---------- Whisper transcription ----------

const MODELS_DIR = process.env.MODELS_DIR || path.join(require('os').homedir(), 'Documents', 'Models');
const WHISPER_CLI = process.env.WHISPER_CLI || 'whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(MODELS_DIR, 'ggml-base.bin');
const TMP_DIR = path.join(__dirname, 'data');

// Check if whisper is available
let whisperAvailable = false;
try {
  if (fs.existsSync(WHISPER_MODEL)) {
    whisperAvailable = true;
  }
} catch {}

app.get('/api/whisper/status', (req, res) => {
  res.json({ available: whisperAvailable });
});

app.post('/api/transcribe', (req, res) => {
  if (!whisperAvailable) {
    return res.status(500).json({ error: 'Whisper not available' });
  }
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const tmpFile = path.join(TMP_DIR, `_voice_${Date.now()}.wav`);
    fs.writeFileSync(tmpFile, buffer);

    execFile(WHISPER_CLI, [
      '-m', WHISPER_MODEL,
      '-f', tmpFile,
      '--no-timestamps',
      '-l', 'auto',
    ], { timeout: 30000 }, (err, stdout, stderr) => {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch {}

      if (err) {
        return res.status(500).json({ error: 'Transcription failed: ' + (err.message || '') });
      }
      const text = stdout.trim();
      res.json({ text });
    });
  });
});

// ---------- Chat history ----------

const CHAT_FILE = path.join(DATA_DIR, 'chat.json');

function loadChat() {
  try { return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8')); }
  catch { return []; }
}

function saveChat(messages) {
  fs.writeFileSync(CHAT_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

app.get('/api/chat/history', (req, res) => {
  res.json(loadChat());
});

app.delete('/api/chat/history', (req, res) => {
  saveChat([]);
  res.json({ ok: true });
});

// ---------- Chat with AI ----------

const CHAT_SYSTEM = `You are a task management assistant for a personal planner app called OT Planner.

## Data structure
Tasks are stored in 4 sections: "now" (do now), "later" (do later), "projects", and "done".
Each task object: { title: string, done: bool, fields: { tags, notes, deadline, color } }

## Color system (IMPORTANT)
Tasks get their color from PROJECTS. Each project in the "projects" section has a color (in fields.color or auto-assigned).
Tasks are linked to projects via fields.tags — the tags are matched against project titles.

For example, if a project is called "My Project" with tags "#my-project", then a task with fields.tags = "#my-project" will show that project's color bar.

When the user adds a task and mentions a project, set fields.tags to the matching project hashtag.
Multiple tags can be space-separated: "#project-a #project-b".

DO NOT set fields.color on tasks — color comes from the project match via tags.

## How to respond
When the user asks to add, move, delete, rename, or rearrange tasks: respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing the FULL updated tasks object (all 4 sections: now, later, projects, done). EVERY section must be present in your response.

If the user is just chatting or asking a question (not modifying tasks), respond normally without JSON.

## CRITICAL — DO NOT DROP TASKS
You MUST copy ALL existing tasks into your response. The JSON you return REPLACES the entire file.
If you omit a task, it is permanently deleted. If you omit a section, all tasks in it are deleted.
- ALWAYS include all 4 sections: "now", "later", "projects", "done"
- ALWAYS copy every task from every section, even sections you are not modifying
- Only remove a task if the user EXPLICITLY asks to delete it
- When adding a task, copy ALL existing tasks first, then append the new one
- When in doubt, include the task — never silently drop anything

## Rules
- When marking a task as done (tick off, complete, finish), MOVE it from its current section to the "done" section, set done: true, and add fields.done with today's date (YYYY-MM-DD)
- When adding a task and the user mentions or implies a project, set fields.tags to the right project hashtag(s)
- When moving a task, remove from source section and add to target
- When reordering, change the array order
- Always preserve ALL existing fields and metadata on tasks you don't modify
- Keep your text response brief — just confirm what you did
- Be friendly and concise`;

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
const OLLAMA_MODELS = ['gemma3:4b'];
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Check which models are available
app.get('/api/models', async (req, res) => {
  const available = [];
  if (GEMINI_API_KEY) {
    available.push(
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
    );
  }
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      const data = await resp.json();
      const installed = (data.models || []).map(m => m.name);
      const OLLAMA_NAMES = { 'gemma3:1b': 'Gemma 3 1B (local)', 'gemma3:4b': 'Gemma 3 4B (local)' };
      for (const id of OLLAMA_MODELS) {
        if (installed.some(n => n === id || n.startsWith(id + ':'))) {
          available.push({ id, name: OLLAMA_NAMES[id] || id, provider: 'ollama' });
        }
      }
    }
  } catch {}
  res.json(available);
});

app.post('/api/chat', async (req, res) => {
  const { message, history, model } = req.body;
  const filePath = path.join(DATA_DIR, 'tasks.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const tasks = parseTasksMd(content);

  // Build project summary for context
  const projectSummary = (tasks.projects || []).map((p, i) => {
    const tag = (p.fields?.tags || '').split(/\s+/)[0] || '#' + p.title.toLowerCase().replace(/\s+/g, '-');
    const color = p.fields?.color || '';
    return `  - "${p.title}" → tag: ${tag}${color ? ', color: ' + color : ''}`;
  }).join('\n');

  const userMsg = `Current projects:\n${projectSummary}\n\nCurrent tasks:\n\`\`\`json\n${JSON.stringify(tasks, null, 2)}\n\`\`\`\n\nUser request: ${message}`;

  let aiText, tokens;

  // Route to Ollama (Gemma) or Gemini
  if (OLLAMA_MODELS.includes(model)) {
    try {
      aiText = await chatOllama(model, userMsg, history);
      tokens = null; // Ollama doesn't charge per token
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    }
    const geminiModel = GEMINI_MODELS.includes(model) ? model : GEMINI_MODELS[0];
    try {
      const result = await chatGemini(geminiModel, userMsg, history);
      aiText = result.text;
      tokens = result.tokens;
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Check if AI returned a JSON update
  const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/);
  let updated = false;
  if (jsonMatch) {
    try {
      const newTasks = JSON.parse(jsonMatch[1]);
      // Validate: reject if AI dropped too many tasks
      const oldCount = ['now', 'later', 'projects', 'done'].reduce((n, s) => n + (tasks[s] || []).length, 0);
      const newCount = ['now', 'later', 'projects', 'done'].reduce((n, s) => n + (newTasks[s] || []).length, 0);
      console.log(`[chat] AI returned JSON — tasks: ${oldCount} → ${newCount}`);
      if (oldCount > 0 && newCount < oldCount * 0.5) {
        console.log(`[chat] REJECTED — would drop ${oldCount - newCount} tasks`);
        aiText = `⚠️ I tried to update tasks but the response would have removed ${oldCount - newCount} of ${oldCount} tasks. Update rejected to protect your data. Please try again with a simpler request.`;
      } else {
        // Fix: move done tasks to "done" section if AI left them in place
        for (const s of ['now', 'later']) {
          const arr = newTasks[s] || [];
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].done) {
              const task = arr.splice(i, 1)[0];
              task.fields = task.fields || {};
              if (!task.fields.done) task.fields.done = new Date().toISOString().slice(0, 10);
              newTasks.done = newTasks.done || [];
              newTasks.done.unshift(task);
              console.log(`[chat] Auto-moved "${task.title}" to done section`);
            }
          }
        }
        createDailyBackup();
        const md = buildTasksMd(newTasks);
        fs.writeFileSync(filePath, md, 'utf-8');
        updated = true;
        console.log(`[chat] Tasks updated successfully`);
      }
    } catch (e) {
      console.log(`[chat] JSON parse error: ${e.message}`);
      console.log(`[chat] Raw JSON:\n${jsonMatch[1].slice(0, 500)}`);
    }
  } else {
    console.log(`[chat] No JSON block in response — text only`);
  }

  // Strip JSON block from visible reply
  const reply = aiText.replace(/```json[\s\S]*?```/g, '').trim() || 'Done!';

  // Persist chat history
  const chat = loadChat();
  chat.push({ role: 'user', text: message, ts: Date.now() });
  chat.push({ role: 'model', text: reply, ts: Date.now() });
  saveChat(chat);

  res.json({ reply, updated, tokens });
});

async function chatGemini(model, userMsg, history) {
  const contents = [];
  if (history && history.length > 0) {
    for (const h of history) {
      contents.push({ role: h.role, parts: [{ text: h.text }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: userMsg }] });

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: CHAT_SYSTEM }] },
        contents,
      }),
    }
  );
  const result = await resp.json();
  if (!resp.ok) {
    throw new Error(result.error?.message || 'Gemini API error');
  }
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = result.usageMetadata || {};
  return {
    text,
    tokens: {
      prompt: usage.promptTokenCount || 0,
      reply: usage.candidatesTokenCount || 0,
      total: usage.totalTokenCount || 0,
    },
  };
}

async function chatOllama(model, userMsg, history) {
  const messages = [{ role: 'system', content: CHAT_SYSTEM }];
  if (history && history.length > 0) {
    for (const h of history) {
      messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text });
    }
  }
  messages.push({ role: 'user', content: userMsg });

  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  const result = await resp.json();
  if (!resp.ok) {
    throw new Error(result.error || 'Ollama error');
  }
  return result.message?.content || '';
}

// ---------- Markdown parser ----------

const SECTIONS = [
  { key: 'now', heading: 'Do Now' },
  { key: 'later', heading: 'Do Later' },
  { key: 'projects', heading: 'My Projects' },
  { key: 'done', heading: 'Done' },
];

function parseTasksMd(md) {
  const result = {};
  for (const s of SECTIONS) result[s.key] = [];

  const lines = md.split('\n');
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headings
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch) {
      const title = headingMatch[1].trim();
      const section = SECTIONS.find(s => s.heading === title);
      if (section) currentSection = section.key;
      continue;
    }

    if (!currentSection) continue;

    // Detect task lines
    const taskMatch = line.match(/^- \[([ x])\] \*\*(.+?)\*\*\s*$/);
    if (taskMatch) {
      const task = {
        done: taskMatch[1] === 'x',
        title: taskMatch[2],
        fields: {},
      };
      // Parse indented lines that follow
      let j = i + 1;
      while (j < lines.length) {
        const sub = lines[j];
        if (!sub.startsWith('  ')) break;
        const trimmed = sub.trim();

        const fieldMatch = trimmed.match(/^- (.+?):\s*(.*)$/);
        if (fieldMatch) {
          task.fields[fieldMatch[1].toLowerCase()] = fieldMatch[2];
        }
        j++;
      }
      result[currentSection].push(task);
      i = j - 1;
    }
  }

  return result;
}

function buildTasksMd(data) {
  let md = '# Tasks\n';
  for (const s of SECTIONS) {
    md += `\n## ${s.heading}\n`;
    const tasks = data[s.key] || [];
    if (tasks.length === 0) {
      md += '\n';
      continue;
    }
    md += '\n';
    for (const t of tasks) {
      const check = t.done ? 'x' : ' ';
      md += `- [${check}] **${t.title}**\n`;
      const fields = t.fields || {};
      for (const [key, val] of Object.entries(fields)) {
        if (val) {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          md += `  - ${label}: ${val}\n`;
        }
      }
      if (t.done && !fields.done) {
        md += `  - Done: ${new Date().toISOString().slice(0, 10)}\n`;
      }
    }
  }
  return md;
}

app.listen(PORT, () => {
  console.log(`ot-planner running at http://localhost:${PORT}`);
});
