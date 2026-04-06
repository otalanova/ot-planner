# OT Planner

A minimal, file-based task and project planner with an AI chat assistant. No database — everything is stored in a single markdown file.

Works on **macOS**, **Linux**, and **Windows**.

## Features

- **Four-column layout** — Chat | Do Now | Do Later | My Projects
- **AI chat** — tell the AI what to add, move, or rearrange in plain language (powered by Gemini)
- **Project colors** — tasks are color-coded by project with colored side bars
- **Drag & drop** — reorder tasks or move them across columns
- **Filter by project** — click a project chip to filter; quick-add while filtered auto-tags the task
- **Inline editing** — click project titles and notes to edit in place
- **Markdown storage** — all data lives in `data/tasks.md`, human-readable and version-controllable
- **Daily backups** — automatic daily snapshots before any change
- **Profiles** — switch between Personal and Demo task lists from the header
- **Voice input** — dictate messages using your browser's built-in speech recognition (Chrome/Edge). Optional local Whisper transcription is also supported (see below)

## Quick start

### Windows note

Windows may show security prompts during setup — this is normal. If the Node.js installer asks for permission to make changes, click **Yes**. If PowerShell shows an execution policy warning, follow the prompt to allow it. If `npm install` or `npm start` fails with a permissions error, try running PowerShell as Administrator (right-click → **Run as administrator**). You may also see a Windows Firewall popup when the server starts — click **Allow access** to let it run on localhost.

### Step 1 — Install Node.js

Download from [https://nodejs.org](https://nodejs.org/) — pick the **LTS** version, run the installer, accept all defaults.

To verify it installed, open **PowerShell** (Windows) or **Terminal** (Mac/Linux) and run:

```
node --version
```

You should see something like `v20.x.x`. If you get "not recognized", restart your terminal after installing.

### Step 2 — Download OT Planner

**Option A — with git:**

```powershell
git clone https://github.com/otalanova/ot-planner.git
```

**Option B — without git:**

Go to [https://github.com/otalanova/ot-planner](https://github.com/otalanova/ot-planner), click the green **Code** button, click **Download ZIP**, and extract the folder.

### Step 3 — Install dependencies

Open **PowerShell** (Windows) or **Terminal** (Mac/Linux), navigate to the folder, and install:

```powershell
cd ot-planner
npm install
```

> **Windows tip:** You can also open the `ot-planner` folder in File Explorer, right-click an empty area, and select **"Open in Terminal"** — this opens PowerShell already in the right folder.

### Step 4 — Add your Gemini API key (optional)

The AI chat feature requires a free Gemini API key. Everything else works without it.

**Get a key:**

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API key"**
4. Copy the key (looks like `AIzaSy...`)

**Create the `.env` file:**

In the `ot-planner` folder, create a file called `.env` with this content:

```
GEMINI_API_KEY=paste-your-key-here
```

Replace `paste-your-key-here` with the key you copied.

**Option A — create a `.env` file (recommended, persists across restarts):**

Windows PowerShell:
```powershell
Set-Content -Path .env -Value "GEMINI_API_KEY=paste-your-key-here"
```

Mac/Linux:
```bash
echo "GEMINI_API_KEY=paste-your-key-here" > .env
```

Or use **Notepad** / any text editor: create a new file, type the line, **Save As** → set filename to `.env` and set "Save as type" to **All Files** (not .txt).

**Option B — set it as an environment variable (works for the current session only):**

Windows PowerShell:
```powershell
$env:GEMINI_API_KEY="paste-your-key-here"
```

Mac/Linux:
```bash
export GEMINI_API_KEY=paste-your-key-here
```

Then run `npm start` in the same terminal window.

### Step 5 — Run

```powershell
npm start
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

To stop the server, press `Ctrl+C` in the terminal.

## How it works

All tasks are stored in `data/tasks.md` as plain markdown:

```markdown
## Do Now

- [ ] **Fix login bug**
  - Tags: #myproject

## Do Later

- [ ] **Write docs**

## My Projects

- [ ] **MyProject**
  - Color: #2dd4bf

## Done
```

Edit the file directly or use the web UI — they stay in sync. Backups are saved as `data/YYYYMMDD_tasks.md` (one per day, created before the first change of the day).

## What gets sent to Gemini

When you use the AI chat, each message sends the following to the Gemini API:

1. **System prompt** — instructions explaining the task data structure, color system, and how to respond (~200 tokens)
2. **Chat history** — the last 10 messages from the conversation (text only)
3. **Your full task state** — all tasks, projects, and done items as JSON, plus a project summary
4. **Your message** — what you typed

Everything runs through your own API key directly to Google's Gemini API. No data is sent to any other server. The token count is shown under each AI reply so you can see exactly how much context is being used.

Without an API key, the chat is disabled but all other features (adding tasks, drag & drop, projects, filtering) work fully offline.

## Voice input

Voice input works out of the box in **Chrome** and **Edge** using the browser's built-in speech recognition — just click the microphone button in the chat area.

For higher-quality offline transcription, you can optionally set up local [Whisper](https://github.com/ggerganov/whisper.cpp):

1. Install `whisper-cli` (e.g. `brew install whisper-cpp` on macOS)
2. Download a Whisper model (e.g. `ggml-base.bin`, ~150 MB) and place it in a `models/` folder inside the project directory
3. Restart the server — the Whisper/Browser toggle will appear automatically

This is entirely optional. Without Whisper, browser voice works fine.

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
