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

## What gets sent to Gemini

When you use the AI chat, each message sends the following to the Gemini API:

1. **System prompt** — instructions explaining the data structure and how to respond (~200 tokens)
2. **Chat history** — the last 10 messages (text only)
3. **Your full task state** — all tasks, projects, and done items as JSON
4. **Your message**

All requests go directly from your server to the Gemini API using your own key. No data is sent to any third party. The token count and cost estimate are shown under each reply.

## Voice input

Voice input works out of the box in **Chrome** and **Edge** using the browser's built-in speech recognition — click the microphone button in the chat area.

For offline transcription, you can optionally set up local [Whisper](https://github.com/ggerganov/whisper.cpp):

1. Install `whisper-cli` (e.g. `brew install whisper-cpp` on macOS)
2. Download a model file (e.g. `ggml-base.bin`, ~150 MB) into a `models/` folder in the project directory
3. Restart the server — a Whisper/Browser toggle will appear

This is entirely optional.

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
