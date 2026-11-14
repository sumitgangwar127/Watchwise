import { db, getProfile } from "./db.js";

const DAY = 864e5;
// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC
const ageDays = (iso) => Math.max(0, (Date.now() - Date.parse(`${iso.replace(" ", "T")}Z`)) / DAY);
const decay = (iso, halfLifeDays) => Math.pow(0.5, ageDays(iso) / halfLifeDays);

// How strongly each kind of usage says "I'm interested in this kind of thing"
const EVENT_WEIGHT = { watch_click: 0.6, trailer_complete: 0.4, trailer_play: 0.25, open: 0.1 };

/**
 * Taste profile as genre weights. It starts from the genres picked in onboarding, then learns:
 * - watched titles (a high rating counts for more, a dropped or low-rated one counts against),
 *   fading with a half-life of about 6 months, so recent taste matters most;
 * - usage events (a "Watch on" click counts more than a trailer play, which counts more than an open),
 *   fading with a half-life of about a month. One of each kind per title per day, so it can't be spammed.
 */
export function computeTaste() {
  const w = {};
  const add = (g, d) => {
    w[g] = (w[g] ?? 0) + d;
  };
  for (const g of getProfile().genres ?? []) add(g, 2);

  const watched = db
    .prepare(
      `SELECT h.status, h.rating, COALESCE(h.watched_at, h.created_at) AS at, t.genres
       FROM history h JOIN titles t ON t.id = h.title_id WHERE h.status IN ('watched', 'dropped')`,
    )
    .all();
  for (const h of watched) {
    const r = h.rating;
    const base = h.status === "dropped" ? -1.5 : r == null ? 1 : r >= 8 ? 2 : r >= 6 ? 1 : r >= 4 ? 0 : -1.5;
    const d = base * decay(h.at, 180);
    for (const g of JSON.parse(h.genres)) add(g, d);
  }

  const events = db
    .prepare(
      `SELECT e.kind, e.ref, e.created_at AS at, date(e.created_at) AS day, t.genres
       FROM events e JOIN titles t ON (t.media_type || '-' || t.tmdb_id) = e.ref
       WHERE e.created_at >= datetime('now', '-120 days')`,
    )
    .all();
  const seen = new Set();
  for (const e of events) {
    const key = `${e.ref}|${e.kind}|${e.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const d = (EVENT_WEIGHT[e.kind] ?? 0) * decay(e.at, 30);
    for (const g of JSON.parse(e.genres)) add(g, d);
  }

  return Object.fromEntries(Object.entries(w).map(([g, v]) => [g, Math.round(v * 100) / 100]));
}

/** The genres with the strongest positive weight, best first. */
export function topGenres(weights, n = 3) {
  return Object.entries(weights)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([g]) => g);
}

/** Recompute and store a snapshot (keeping the last 30). */
export function saveTaste() {
  const weights = computeTaste();
  db.prepare("INSERT INTO taste_snapshots (weights) VALUES (?)").run(JSON.stringify(weights));
  db.exec("DELETE FROM taste_snapshots WHERE id NOT IN (SELECT id FROM taste_snapshots ORDER BY id DESC LIMIT 30)");
  return weights;
}

/** The latest stored taste, or a live computation if none has been saved yet. */
export function latestTaste() {
  const row = db.prepare("SELECT weights, created_at FROM taste_snapshots ORDER BY id DESC LIMIT 1").get();
  return row ? { weights: JSON.parse(row.weights), at: row.created_at } : { weights: computeTaste(), at: null };
}
