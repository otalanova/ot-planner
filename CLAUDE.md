# CLAUDE.md — OT Planner

## Project overview
Personal task/project planner: Node.js + Express backend, vanilla HTML/CSS/JS single-page frontend. Markdown file (`data/tasks.md`) is the single source of truth. AI chat powered by Gemini. Supports multiple profiles (e.g. Personal / Demo).

## Architecture
- `server.js` — Express server on port 3001. Parses/builds markdown, serves API, proxies AI chat (Gemini API or local Gemma via Ollama), manages profiles.
- `public/index.html` — Entire frontend in one file. No build step, no framework.
- `data/tasks.md` — Active task file (4 sections: Do Now, Do Later, My Projects, Done). Created from template on first run.
- `data/tasks.template.md` — Starter template for new users.
- `data/tasks.demo.md` — Demo profile data (committed).
- `data/tasks.personal.md` — Personal profile data (gitignored).
- `data/chat.json` — Persisted chat history (gitignored).
- `~/Documents/Models/` — Shared model directory (Whisper `ggml-base.bin`, etc.).
- `.env` — GEMINI_API_KEY (gitignored, optional if using Gemma).

## Key conventions
- **Color system**: Tasks get colors from projects via `fields.tags` matching. Never set `fields.color` on tasks — only on projects.
- **`getProjectColorMap()`** matches by: joined title, hyphenated title, individual title words (>2 chars), and `fields.tags`. Cached per render cycle via `_colorMapCache`.
- **All rendering is client-side** — `index.html` fetches JSON from `/api/tasks` and renders in JS.
- **Event delegation** — Dynamic HTML uses `data-action`/`data-section`/`data-index` attributes. A single set of listeners on `document` handles click, change, keydown, and drag events. Only static HTML (header, chat, drawer) uses inline handlers.
- **Filter chips** filter visible tasks AND auto-tag new quick-add tasks with the active project.
- **Save queue** — `save()` serializes concurrent writes to prevent race conditions.

## Common pitfalls
- The AI chat (Gemini) returns the FULL tasks JSON. If not careful, it can wipe out tasks from other sections. The system prompt instructs it to preserve all existing tasks.
- Deleting a project cascades — all tasks tagged with that project are also removed (with a confirmation prompt).
- Browsers may cache `index.html` — hard-refresh (Cmd+Shift+R or Ctrl+Shift+R) after changes.
