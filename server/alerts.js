import { db } from "./db.js";

/** Create an in-app alert. A title/platform pair is only announced once per 14 days. */
export function addAlert({ kind, titleId = null, platform = null, message }) {
  if (titleId) {
    const dup = db
      .prepare(
        `SELECT 1 FROM alerts WHERE kind = ? AND title_id = ? AND COALESCE(platform, '') = COALESCE(?, '')
         AND created_at >= datetime('now', '-14 days')`,
      )
      .get(kind, titleId, platform);
    if (dup) return false;
  }
  db.prepare("INSERT INTO alerts (kind, title_id, platform, message) VALUES (?, ?, ?, ?)").run(kind, titleId, platform, message);
  return true;
}

export function listAlerts(limit = 40) {
  return db
    .prepare(
      `SELECT a.id, a.kind, a.message, a.platform, a.created_at, a.read_at,
              t.media_type, t.tmdb_id, t.title, t.poster_url
       FROM alerts a LEFT JOIN titles t ON t.id = a.title_id
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(limit)
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      message: a.message,
      platform: a.platform,
      at: a.created_at,
      read: Boolean(a.read_at),
      ref: a.tmdb_id ? `${a.media_type}-${a.tmdb_id}` : null,
      title: a.title ?? null,
      poster: a.poster_url ?? null,
    }));
}

export const unreadCount = () => db.prepare("SELECT COUNT(*) AS n FROM alerts WHERE read_at IS NULL").get().n;

export function markRead(id = null) {
  if (id) db.prepare("UPDATE alerts SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL").run(id);
  else db.exec("UPDATE alerts SET read_at = datetime('now') WHERE read_at IS NULL");
}
