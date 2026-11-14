import { db } from "./db.js";
import { ensureTitle } from "./catalog.js";

export const STATUSES = ["watched", "dropped", "watchlist", "not_interested"];
const ID_RE = /^(movie|tv)-(\d+)$/;

export const parseTitleId = (id) => {
  const m = ID_RE.exec(String(id));
  return m ? { type: m[1], tmdbId: Number(m[2]) } : null;
};

/** Everything the user has marked, newest first, with enough title info to render cards. */
export function listHistory() {
  return db
    .prepare(
      `SELECT h.status, h.rating, h.watched_at, h.created_at,
              t.media_type, t.tmdb_id, t.title, t.year, t.poster_url, t.backdrop_url, t.genres
       FROM history h JOIN titles t ON t.id = h.title_id
       ORDER BY COALESCE(h.watched_at, h.created_at) DESC`,
    )
    .all()
    .map((r) => ({
      id: `${r.media_type}-${r.tmdb_id}`,
      type: r.media_type === "movie" ? "movie" : "tv",
      status: r.status,
      rating: r.rating,
      at: r.watched_at ?? r.created_at,
      title: r.title,
      year: r.year,
      poster: r.poster_url,
      backdrop: r.backdrop_url,
      genres: JSON.parse(r.genres),
    }));
}

/**
 * Create or update the single history entry for a title. A rating is kept if a later
 * call doesn't supply one. Fetches the title from TMDB first if it isn't stored yet.
 */
export async function setHistory(id, status, rating = null) {
  const parsed = parseTitleId(id);
  if (!parsed) throw new Error("Invalid title id");
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 10)) {
    throw new Error("Rating must be a whole number from 1 to 10");
  }

  const titleId = await ensureTitle(parsed.type, parsed.tmdbId);
  const watchedAt = status === "watched" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;

  db.prepare(
    `INSERT INTO history (title_id, status, rating, source, watched_at) VALUES (?, ?, ?, 'manual', ?)
     ON CONFLICT(title_id) DO UPDATE SET
       status = CASE WHEN history.status = 'watched' AND excluded.status = 'watchlist' THEN history.status ELSE excluded.status END,
       rating = COALESCE(excluded.rating, history.rating),
       watched_at = CASE WHEN excluded.status = 'watched' THEN COALESCE(history.watched_at, excluded.watched_at) ELSE history.watched_at END`,
  ).run(titleId, status, rating, watchedAt);
  return parsed;
}

/** Remove a title's history entry. With `onlyStatus`, only if it currently has that status (so un-saving never erases "watched"). */
export function removeHistory(id, onlyStatus = null) {
  const parsed = parseTitleId(id);
  if (!parsed) throw new Error("Invalid title id");
  db.prepare(
    `DELETE FROM history WHERE title_id IN (SELECT id FROM titles WHERE media_type = ? AND tmdb_id = ?)
     AND (? IS NULL OR status = ?)`,
  ).run(parsed.type, parsed.tmdbId, onlyStatus, onlyStatus);
}
