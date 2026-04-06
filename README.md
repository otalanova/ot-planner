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

## Quick start

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
