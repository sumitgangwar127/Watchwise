# Watchwise roadmap

Where the project is going. Items are goals, not promises, and the order can change. Tick a box when it ships.

**Vision:** one private taste profile on your own computer, powered by the AI you already use, that tells you what to watch next across every platform you have. Local-first, free, no login.

## Where we are today

| Area | Status |
|---|---|
| Onboarding (country, platforms, AI choice, taste, history) | Built |
| Real catalog from TMDB: posters, backdrops, ratings, availability by country and platform | Built |
| Home screen, Explore, Experimental lane, My List, Watched tab | Built |
| Title pages: trailer, cast, details, where to watch, similar titles | Built |
| "Watched already": saved locally, hides the title, shifts your taste | Built |
| Home-theater trailer player, ambient lighting, intermission mode | Built |
| Local SQLite database, `npm run refresh`, `npm run status`, `npm run jobs` | Built |
| Scheduler with catch-up, Schedules panel, daily find-new, availability sync, taste update, maintenance, weekly backup and health check | Built |
| Alerts (new titles found, saved title arrives or leaves your apps), usage events feeding taste | Built |
| Intermission with stories, facts and moments from verified TMDB data | Built |
| Recommendations | **Placeholder:** simple genre and history scoring, not AI |
| AI suggestion engine (Claude Code, Codex, Cursor Agent, Gemini) | **Not built** (CLIs are detected, never called) |
| Watch history import | **Not built** (pasted titles are stored as raw text) |
| Chat and agent control (CLI commands, MCP) | **Not built** |

## Phase 1: Make it a real recommendation engine

The core promise. Everything else builds on this.

- [ ] **AI suggestion engine.** Run the user's chosen AI command line headlessly with the rule files in `rules/` and the user's data, and return structured picks.
  - [ ] Verify the headless flags for each CLI (they are placeholders today)
  - [ ] Validate every pick against real TMDB titles so nothing is invented
  - [ ] Store each suggestion with its reason and how the user reacted
  - [ ] Cache results and refresh daily, not on every page load
  - [ ] Treat web content as untrusted: the AI returns JSON only, the app does all writing
- [x] **Daily refresh** with catch-up when the app is opened after a missed day (scheduler, `npm run jobs -- run find-new`)
- [ ] A dedicated `find-new` command shortcut
- [ ] **Watch history import**
  - [ ] Paste a list of titles and match them to TMDB
  - [ ] Netflix and Amazon "download my data" exports
  - [ ] Letterboxd and Trakt exports or APIs
  - [ ] No scraping and no logging in to streaming accounts
- [ ] **One-command install** (`npx`) so people don't need to clone the repo

## Phase 2: Smarter taste

- [x] Usage signals (opens, trailer plays, "Watch on" clicks) and recency decay in the taste profile
- [ ] More signals: drop-offs, "not interested", rewatches, cast and director, runtime and mood ("I have 90 minutes")
- [ ] Close the experimental loop: promote a genre into the main feed after you rate a few of its picks highly
- [ ] "Why this?" on every pick, and a way to correct the AI ("stop suggesting horror")
- [ ] A readable taste-profile file that you and the AI both edit
- [ ] "Not interested" and "dropped" buttons (the database already supports them)

## Phase 3: Control it from chat

- [ ] CLI commands: `find-new`, `log-watched`, `recommend`
- [ ] MCP server so any agent can run the same commands
- [ ] Say "I watched Dark, loved it" in any AI chat and have it recorded
- [ ] `AGENTS.md` kept accurate as commands land

## Phase 4: Features people will use

- [ ] **Watch together:** combine two or more people's tastes and platforms into one pick, exchanged as local files
- [x] **Alerts:** a saved title reached one of your apps, or left one
- [ ] Alerts for a title that is about to leave (TMDB doesn't publish this, so it needs another source)
- [ ] **Series tracking:** where you are in a show, and "next up"
- [ ] **Lists and moods:** shelves like "rainy-day comfort" or "mind-benders"
- [ ] **Subscription helper:** which of your apps you barely use
- [ ] **Release calendar** for shows you follow

## Phase 5: Polish and reach

- [ ] More regions, more platforms, and exact per-title links (today "Watch on" opens the platform's search)
- [ ] Phone-first experience and installable web app (PWA)
- [ ] Accessibility pass and more languages
- [ ] Desktop app wrapper for people who don't use a terminal
- [ ] More theater room styles, keeping motion calm
- [ ] Re-check the trailer player and room at phone sizes

## Project and community

- [ ] Choose a license (MIT is common) and add `LICENSE`
- [ ] Contribution guide and issue templates
- [ ] Tests and CI
- [ ] Real screenshots and a demo video in the README
- [ ] A plugin format for other data sources or recommendation rules

## Decisions to make early

- **Commercial use.** TMDB's free tier is for non-commercial use. A paid product would need a commercial TMDB license or another data source.
- **Privacy promise.** Staying local-first is the main difference from every other recommender. Anything that sends data out (sharing, sync) should be opt-in and clearly explained.
- **Supporting several AIs.** Each CLI has different flags and web-search behaviour. That is an ongoing maintenance cost, so keep the adapter layer small.
- **Audience.** Developers who already use AI agents are the easiest first users. Everyone else needs the one-command install and a desktop app.

## Suggested order

1. AI engine and daily refresh
2. History import
3. One-command install, license and screenshots
4. Chat and agent control
5. Watch together and alerts
