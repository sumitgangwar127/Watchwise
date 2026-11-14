# Watchwise

**One taste profile across every streaming platform. Private, local and free.**

Every streaming app recommends only from its own catalog, using only what you did on that app. Watchwise keeps a single taste profile on your own computer and uses the AI you already have (Claude Code, Codex, Gemini CLI, Cursor) to decide what you should watch next, wherever it streams.

> **Status: early stage.** The app shell, onboarding and dashboard design work today, but the dashboard shows a **sample catalog** with generated posters. The real catalog and the AI suggestion engine are not built yet. See [What works today](#what-works-today).

## Why

- Recommendations differ on every platform, and none of them knows your full taste.
- Paid recommendation apps cost money you may not want to spend.
- Your watch history is your data. It should live on your machine, not on someone else's server.

## How it is meant to work

```
React app  ⇄  local server  ⇄  SQLite (your data stays on your machine)
                  │
                  └─ AI command line (Claude / Codex / Cursor / Gemini)
                       reads rules/*.md + your data, searches the web daily
```

- **No login, no cloud.** Everything is stored in a local SQLite file.
- **Your AI is the suggestion engine.** The server runs your installed AI's command line in headless mode. There are no API keys in the app and no subscription to this project.
- **Editable rules.** How the AI recommends is described in plain markdown files in [`rules/`](rules). Change them to tune the engine.
- **Daily catalog update.** The plan is for the AI to search the web once a day for new releases and streaming availability, then add verified titles to the local database.
- **Experimental lane.** A separate section suggests genres you have not tried. What you watch from it feeds back into your main recommendations.
- **Works from chat.** Open the project in any AI agent and ask it to "refresh" or "find new content". [`AGENTS.md`](AGENTS.md) tells agents how.
- **"Watch on" links** open the right platform for each title.

## What works today

| Area | Status |
|---|---|
| Animated intro (film-leader countdown, curtains) | Works |
| Onboarding: country, platforms, AI choice, taste, watch history | Works, saved locally |
| Detects installed AI CLIs (Claude, Codex, Cursor, Gemini) | Works |
| Local SQLite database and schema | Works (only the profile table is used so far) |
| Dashboard: banner, rows, explore, experimental, My List, title details | Works with **sample titles** |
| "Watch on" buttons | Work. Some platforms open that platform's search, others open a web search. Exact per-title links come with the real catalog. |
| Mobile and desktop layouts | Work |
| Real catalog and real posters (TMDB) | **Not built** |
| AI suggestion engine | **Not built** (the AI is never called yet) |
| Daily refresh and catch-up on open | **Not built** |
| CLI commands `refresh`, `find-new`, `log-watched`, `recommend` | **Not built** (`status` works) |
| Matching pasted watch history to titles | **Not built** (stored as raw text) |
| Chat/MCP access | **Not built** |

## Quick start

Requires **Node.js 22.5 or newer** (the app uses Node's built-in SQLite).

```bash
git clone https://github.com/sumitgangwar127/Watchwise.git
cd Watchwise
npm install
npm start
```

Then open http://localhost:5173.

**Or let your AI do it.** Open a terminal in any folder and tell your AI agent:

> Clone https://github.com/sumitgangwar127/Watchwise and follow AGENTS.md to set it up and start it.

### Open it on your phone

`npm start` also serves the web app on your local network. Find your computer's local address and open `http://<that-address>:5173` on a phone on the same Wi-Fi. Only the web app is exposed. The API listens on `127.0.0.1` only and is reached through the web app's proxy.

### Check your setup

```bash
npm run status
```

Shows whether you have finished onboarding, row counts, and which AI command lines were found.

## Project layout

```
client/   React + Vite + Tailwind + Framer Motion web app
server/   Hono API, SQLite schema (schema.sql), AI provider registry
cli/      command line used by the UI, the daily job and chat
rules/    suggestion engine rules in plain markdown
data/     your local database (git-ignored)
AGENTS.md instructions for AI agents (CLAUDE.md points to it)
```

## Supported AI tools

Watchwise looks for these command lines on your `PATH`:

| Tool | Command |
|---|---|
| Claude Code | `claude` |
| Codex CLI | `codex` |
| Cursor Agent | `cursor-agent` |
| Gemini CLI | `gemini` |

Adding another is a small change in [`server/providers/index.js`](server/providers/index.js). The headless flags in that file are placeholders and have not been verified against each tool yet.

## Privacy

- Your profile, history and ratings are stored only in `data/watchwise.db` on your computer.
- Nothing is sent to this project.
- When the AI features arrive, your chosen AI tool will receive the data it needs to make recommendations, under that tool's own terms.

## Roadmap

1. Connect TMDB for real titles, posters and streaming availability.
2. `refresh` and `find-new` commands, plus the daily update with catch-up on open.
3. AI suggestion engine driven by the rules files, with checks so only real titles are added.
4. Watch history import (paste, CSV exports) matched to real titles.
5. Experimental lane feedback loop.
6. Chat/MCP access.
7. One-command install.

## Data and credits

Movie and show data will come from [TMDB](https://www.themoviedb.org). Each person should use their own free TMDB key, kept in a local `.env` file that is never committed.

> This product will use the TMDB API but is not endorsed or certified by TMDB.

TMDB's free tier is for non-commercial use.

## Contributing

Issues and pull requests are welcome while the project is taking shape. Please keep changes small and focused.

## License

Not yet chosen.
