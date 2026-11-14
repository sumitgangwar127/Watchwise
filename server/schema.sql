-- Watchwise local database. Everything stays on this machine.

-- Key/value profile: country, platforms, chosen AI provider, taste summary, onboarded flag
CREATE TABLE IF NOT EXISTS profile (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Content catalog: shared pool of titles the UI browses. Updated a little each day.
CREATE TABLE IF NOT EXISTS titles (
  id          INTEGER PRIMARY KEY,
  tmdb_id     INTEGER,
  media_type  TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title       TEXT NOT NULL,
  year        INTEGER,
  overview    TEXT,
  genres      TEXT NOT NULL DEFAULT '[]',   -- JSON array
  poster_url  TEXT,
  rating      REAL,
  trend_score REAL NOT NULL DEFAULT 0,
  first_seen  TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (media_type, tmdb_id)
);

-- Where each title streams, per country
CREATE TABLE IF NOT EXISTS availability (
  title_id     INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  region       TEXT NOT NULL,
  platform     TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'stream',  -- stream | rent | buy
  last_checked TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (title_id, region, platform, kind)
);

-- Your watch history and reactions (the personal dataset)
CREATE TABLE IF NOT EXISTS history (
  id         INTEGER PRIMARY KEY,
  title_id   INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('watched', 'dropped', 'watchlist', 'not_interested')),
  rating     INTEGER CHECK (rating BETWEEN 1 AND 10),
  platform   TEXT,
  watched_at TEXT,
  source     TEXT NOT NULL DEFAULT 'manual',  -- manual | import | chat
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- What the AI suggested, in which lane, why, and how you reacted
CREATE TABLE IF NOT EXISTS suggestions (
  id         INTEGER PRIMARY KEY,
  title_id   INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  lane       TEXT NOT NULL CHECK (lane IN ('main', 'experimental')),
  reason     TEXT,
  reaction   TEXT,                            -- liked | skipped | watched | null
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per refresh run (daily job, chat command, or manual button)
CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY,
  kind        TEXT NOT NULL,                  -- daily | manual | onboarding
  provider    TEXT,
  status      TEXT NOT NULL DEFAULT 'running',
  added       INTEGER NOT NULL DEFAULT 0,
  updated     INTEGER NOT NULL DEFAULT 0,
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

-- What each run changed, so "what's new" works and bad updates are traceable
CREATE TABLE IF NOT EXISTS change_log (
  id         INTEGER PRIMARY KEY,
  run_id     INTEGER REFERENCES runs(id) ON DELETE CASCADE,
  title_id   INTEGER REFERENCES titles(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,                   -- added | updated | removed_from_platform
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_titles_first_seen ON titles(first_seen);
CREATE INDEX IF NOT EXISTS idx_history_title ON history(title_id);
CREATE INDEX IF NOT EXISTS idx_availability_region ON availability(region, platform);
