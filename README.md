# OT Planner

A minimal, file-based task and project planner with an AI chat assistant. No database — everything is stored in a single markdown file.

Developed on macOS. Windows and Linux testing is ongoing.

## Features

- **Four-column layout** — Chat | Do Now | Do Later | My Projects
- **AI chat** — add, move, or rearrange tasks in plain language (powered by Gemini, requires API key)
- **Project colors** — tasks are color-coded by project via colored side bars
- **Drag & drop** — reorder tasks or move them between columns
- **Filter by project** — click a project chip to filter; quick-add auto-tags with the active project
- **Inline editing** — click task titles, project names, and notes to edit in place
- **Markdown storage** — all data lives in `data/tasks.md`, human-readable and version-controllable
- **Daily backups** — automatic snapshot before the first change of each day
- **Profiles** — switch between Personal and Demo task lists from the header
- **Voice input** — dictate via your browser's built-in speech recognition (Chrome/Edge). Local Whisper transcription can also be installed for offline use

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer

### Windows note

Windows may show security prompts during setup — this is normal. Click **Yes** when the installer asks for permission, and **Allow access** if a firewall popup appears when the server starts. If `npm install` or `npm start` fails with a permissions error, try running PowerShell as Administrator (right-click → **Run as administrator**).

### Step 1 — Install Node.js

Download from [https://nodejs.org](https://nodejs.org/) — pick the **LTS** version, run the installer, accept all defaults.

Verify it worked — open **PowerShell** (Windows) or **Terminal** (Mac/Linux):

```
node --version
```

You should see something like `v20.x.x`. If you get "not recognized", restart your terminal.

### Step 2 — Download OT Planner

**With git:**
```powershell
git clone https://github.com/otalanova/ot-planner.git
```

**Without git:** go to the [repository page](https://github.com/otalanova/ot-planner), click the green **Code** button → **Download ZIP**, and extract the folder.

### Step 3 — Install and run

Open a terminal in the `ot-planner` folder and run:

```powershell
cd ot-planner
npm install
npm start
```

Open [http://localhost:3001](http://localhost:3001) in your browser. To stop the server, press `Ctrl+C`.

> **Windows tip:** Open the folder in File Explorer, right-click an empty area → **"Open in Terminal"** to get PowerShell in the right directory.

### Step 4 — Add a Gemini API key (optional)

The AI chat requires a Gemini API key. The key itself is free, but API usage is billed by Google — see [Gemini pricing](https://ai.google.dev/pricing). The token count and estimated cost are shown under each AI reply. Everything else (tasks, drag & drop, projects, filtering) works without a key.

**Get a key:**

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API key"** and copy it

**Set the key** (pick one method):

**Option A — `.env` file (recommended, persists across restarts):**

Create a file called `.env` in the `ot-planner` folder with one line:

```
GEMINI_API_KEY=paste-your-key-here
```

From the terminal:

Windows PowerShell:
```powershell
Set-Content -Path .env -Value "GEMINI_API_KEY=paste-your-key-here"
```

Mac/Linux:
```bash
echo "GEMINI_API_KEY=paste-your-key-here" > .env
```

Or use any text editor — save the file as `.env` (on Windows: set "Save as type" to **All Files**, not .txt).

**Option B — environment variable (current session only):**

Windows PowerShell:
```powershell
$env:GEMINI_API_KEY="paste-your-key-here"
```

Mac/Linux:
```bash
export GEMINI_API_KEY=paste-your-key-here
```

Then run `npm start` in the same terminal.

## How it works

All tasks are stored in `data/tasks.md` as plain markdown:

```markdown
## Do Now

- [ ] **Book theory exam**
  - Tags: #my-project

## Do Later

- [ ] **Write docs**

## My Projects

- [ ] **My Project**
  - Color: #2dd4bf
  - Tags: #my-project

## Done
```

Edit the file directly or use the web UI — they stay in sync.

## What gets sent to the AI

When you use the AI chat, each message sends the following to the selected model (Gemini API or local Gemma via Ollama):

1. **System prompt** — instructions explaining the data structure and how to respond (~200 tokens)
2. **Chat history** — the last 10 messages (text only)
3. **Your full task state** — all tasks, projects, and done items as JSON
4. **Your message**

With Gemini, requests go directly from your server to the Gemini API using your own key. With Gemma, everything stays on your machine. The token count and cost estimate are shown under each reply (local models show "free").

## Voice input

Voice input works out of the box in **Chrome** and **Edge** using the browser's built-in speech recognition — click the microphone button in the chat area.

For offline transcription, you can optionally set up local [Whisper](https://github.com/ggerganov/whisper.cpp):

1. Install `whisper-cli` (e.g. `brew install whisper-cpp` on macOS)
2. Download a model file (e.g. `ggml-base.bin`, ~150 MB) into `~/Documents/Models/`
3. Restart the server — a Whisper/Browser toggle will appear

This is entirely optional.

## Local AI with Ollama

You can run a fully local AI chat using [Ollama](https://ollama.com) — no API key, no cloud, fully offline:

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model: `ollama pull gemma3:4b`
3. Restart the server — the model will appear in the chat dropdown

The app auto-detects installed Ollama models on startup. Any model Ollama supports can be added to the `OLLAMA_MODELS` list in `server.js`.

### Tested models

| Model | Size | Speed on MacBook Air | Reliability | Verdict |
|-------|------|---------------------|-------------|---------|
| `gemma3:1b` | ~1 GB | Fast (~5s) | Poor — drops tasks, renames things, returns broken JSON | **Not recommended** |
| `gemma3:4b` | ~3 GB | Slow (30–60s) | Mixed — better at preserving tasks, but still makes mistakes | **Use with caution** |

### Why local models struggle

The AI chat works by sending your full task list as JSON and asking the model to return it in full with changes applied. This requires the model to faithfully copy dozens of tasks verbatim — something small local models are bad at. Common failure modes:

- Silently dropping tasks from sections
- Renaming tasks the user didn't ask to change
- Duplicating entries
- Returning invalid JSON that fails to parse

The app has a safety check that rejects AI updates that would remove more than half your tasks, plus server-side logging to help diagnose issues. But the safeguard is not foolproof — a model can still corrupt data while keeping the task count close enough.

### Tips for local models

Small models (4B and under) are not flagship-level — they need explicit, simple instructions to work well. When using them:

- **Be specific:** say "mark OCR task as done and move to done section" instead of just "tick off OCR"
- **One change at a time:** don't ask to add, rename, and move tasks in a single message
- **Avoid ambiguity:** use exact task names rather than shorthand

The system prompt has been tuned to give small models extra guidance (e.g. explicitly telling them to move completed tasks to the "done" section), but they will still make mistakes that Gemini handles effortlessly.

### Recommendation

Use **Gemini** (free tier available) for reliable task management. Local models are best suited for chat questions that don't modify tasks, experimentation, or fully offline use. If you use a local model, keep an eye on the server logs for rejected updates.

### Ollama model storage

By default Ollama stores models in `~/.ollama/models`. To change the location (e.g. to share models across projects), set the `OLLAMA_MODELS` environment variable before starting Ollama:

```bash
export OLLAMA_MODELS=~/Documents/Models/ollama
```

Add it to your `~/.zshrc` (or `~/.bashrc`) to make it permanent.

## Project structure

```
ot-planner/
  server.js           # Express backend (API + static files)
  public/index.html   # Entire frontend (single file, no build step)
  data/tasks.md       # Your tasks (created on first run)
  data/tasks.demo.md  # Demo profile data
  .env                # API key (gitignored)
```

## License

MIT
