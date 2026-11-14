import { db } from "./db.js";

export const EVENT_KINDS = ["open", "trailer_play", "trailer_complete", "watch_click"];

/** Record a local usage event. These stay in this database and feed the taste profile. */
export function recordEvent(kind, ref, platform = null) {
  if (!EVENT_KINDS.includes(kind)) throw new Error("Unknown event kind");
  if (!/^(movie|tv)-\d+$/.test(ref)) throw new Error("Invalid title id");
  db.prepare("INSERT INTO events (kind, ref, platform) VALUES (?, ?, ?)").run(kind, ref, platform ? String(platform).slice(0, 30) : null);
}

export const eventCount = () => db.prepare("SELECT COUNT(*) AS n FROM events").get().n;

export function clearEvents() {
  db.exec("DELETE FROM events");
}
