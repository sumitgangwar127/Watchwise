import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { addAlert } from "./alerts.js";
import {
  PLATFORM_NAMES,
  discoverTrendAndNew,
  finishRun,
  ingestRecommendations,
  refreshCatalog,
  startRun,
  syncAvailability,
} from "./catalog.js";
import { dataDir, db, getProfile } from "./db.js";
import { listHistory, parseTitleId } from "./history.js";
import { verifyProvider } from "./providers/index.js";
import { saveTaste } from "./taste.js";
import { tmdb, tmdbConfigured } from "./tmdb.js";

/**
 * Scheduled jobs. Watchwise is local-first, so there is no server in the cloud: jobs run while the
 * app is open (checked every minute), catch up when the app is opened after a missed run, and can
 * also be run by hand or from the operating system's scheduler (`npm run jobs -- run-due`).
 *
 * A job returns a message, or `{ status: "warn", message }`. Throwing marks it failed and retries later.
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const needsTmdb = () => {
  if (!getProfile().country) return "Finish onboarding first";
  if (!tmdbConfigured()) return "Add a TMDB token to .env first";
  return null;
};

// ---------------------------------------------------------------- jobs

/** Trending now, newly released, popular on your apps in your genres, and titles like ones you liked. */
async function findNew() {
  const trend = await discoverTrendAndNew("scheduled");
  const popular = await refreshCatalog("scheduled");

  // Past data: titles similar to your most recent favourites
  const liked = listHistory()
    .filter((h) => h.status === "watched" && (h.rating == null || h.rating >= 8))
    .slice(0, 3);
  let similar = 0;
  for (const h of liked) {
    const p = parseTitleId(h.id);
    if (!p) continue;
    try {
      similar += (await ingestRecommendations(p.type, p.tmdbId)).added;
    } catch {
      /* one title failing shouldn't stop the rest */
    }
  }

  const added = trend.added + popular.added + similar;
  if (added > 0) addAlert({ kind: "digest", message: `${added} new title${added === 1 ? "" : "s"} found for you today` });
  return `${added} new (${trend.trending} trending, ${trend.fresh} new releases checked, ${similar} similar to what you liked), ${popular.updated + trend.updated} refreshed`;
}

/** Re-check where your saved and top titles stream; alert when a saved title arrives on or leaves one of your apps. */
async function syncAvailabilityJob() {
  const profile = getProfile();
  const region = profile.country;
  const mine = new Set(profile.platforms ?? []);

  const watchlist = db
    .prepare(
      `SELECT t.id, t.media_type AS type, t.tmdb_id AS tmdbId FROM history h JOIN titles t ON t.id = h.title_id
       WHERE h.status = 'watchlist'`,
    )
    .all();
  const top = db
    .prepare(
      `SELECT t.id, t.media_type AS type, t.tmdb_id AS tmdbId FROM titles t
       WHERE t.id IN (SELECT title_id FROM availability WHERE region = ?) ORDER BY t.trend_score DESC LIMIT 60`,
    )
    .all(region);
  const rows = [...new Map([...watchlist, ...top].map((r) => [r.id, r])).values()];
  if (!rows.length) return "Nothing to check yet";

  const run = startRun("availability");
  try {
    const diff = await syncAvailability(rows, region, run);
    finishRun(run, "ok");

    const saved = new Set(watchlist.map((r) => r.id));
    const nameOf = db.prepare("SELECT title FROM titles WHERE id = ?");
    let arrived = 0;
    let left = 0;
    for (const a of diff.arrived.filter((x) => saved.has(x.titleId) && mine.has(x.platform))) {
      const name = nameOf.get(a.titleId)?.title;
      if (addAlert({ kind: "arrived", titleId: a.titleId, platform: a.platform, message: `${name} is now on ${PLATFORM_NAMES[a.platform] ?? a.platform}` })) arrived++;
    }
    for (const a of diff.removed.filter((x) => saved.has(x.titleId) && mine.has(x.platform))) {
      const name = nameOf.get(a.titleId)?.title;
      if (addAlert({ kind: "left", titleId: a.titleId, platform: a.platform, message: `${name} has left ${PLATFORM_NAMES[a.platform] ?? a.platform}` })) left++;
    }
    return `Checked ${rows.length} titles (${watchlist.length} saved): ${arrived} arrived, ${left} left`;
  } catch (e) {
    finishRun(run, "error");
    throw e;
  }
}

/** Recompute the taste profile from your history and usage, and keep a snapshot. */
async function updateTaste() {
  const weights = saveTaste();
  const top = Object.entries(weights)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);
  return top.length ? `Leaning towards ${top.join(", ")}` : "Not enough data yet";
}

/** Tidy the local database. */
async function maintenance() {
  const del = (sql) => db.prepare(sql).run().changes;
  const details = del("DELETE FROM title_details WHERE fetched_at < datetime('now', '-14 days')");
  const titles = del(
    `DELETE FROM titles WHERE last_seen < datetime('now', '-60 days')
     AND id NOT IN (SELECT title_id FROM history) AND id NOT IN (SELECT title_id FROM suggestions)`,
  );
  const logs =
    del("DELETE FROM change_log WHERE created_at < datetime('now', '-90 days')") +
    del("DELETE FROM runs WHERE started_at < datetime('now', '-90 days')");
  const events = del("DELETE FROM events WHERE created_at < datetime('now', '-365 days')");
  const alerts = del("DELETE FROM alerts WHERE read_at IS NOT NULL AND created_at < datetime('now', '-60 days')");
  db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA optimize;");
  return `Removed ${titles} stale titles, ${details} cached pages, ${logs} old log rows, ${events} old events, ${alerts} old alerts`;
}

/** A consistent copy of the database (your watch history is your personal dataset). Keeps the last four. */
async function backup() {
  const dir = join(dataDir, "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `watchwise-${new Date().toISOString().slice(0, 10)}.db`);
  if (existsSync(file)) unlinkSync(file);
  db.prepare("VACUUM INTO ?").run(file);
  const all = readdirSync(dir).filter((f) => /^watchwise-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  for (const old of all.slice(0, -4)) unlinkSync(join(dir, old));
  return `Saved data/backups/${file.split("/").pop()} (${Math.min(all.length, 4)} kept)`;
}

/** Is everything still working? */
async function health() {
  const problems = [];
  if (!tmdbConfigured()) problems.push("the TMDB token is missing");
  else {
    try {
      await tmdb("/configuration");
    } catch (e) {
      problems.push(`TMDB isn't answering (${e.message})`);
    }
  }
  const provider = getProfile().provider;
  if (provider && !verifyProvider(provider).ok) problems.push(`the ${provider} command line isn't working`);
  if (!problems.length) return "TMDB and your AI command line are working";
  const message = `Heads up: ${problems.join(" and ")}.`;
  addAlert({ kind: "health", message });
  return { status: "warn", message };
}

export const JOBS = [
  {
    id: "find-new",
    name: "Find new content",
    description: "Trending titles, new releases, and titles similar to ones you liked, on your apps in your country.",
    every: DAY,
    firstRunAfter: 12 * HOUR, // onboarding has just built the catalog
    needs: needsTmdb,
    run: findNew,
  },
  {
    id: "sync-availability",
    name: "Check where titles stream",
    description: "Re-checks your saved and top titles, and alerts you when a saved title reaches or leaves one of your apps.",
    every: DAY,
    firstRunAfter: 10 * MIN,
    needs: needsTmdb,
    run: syncAvailabilityJob,
  },
  {
    id: "update-taste",
    name: "Update your taste profile",
    description: "Recalculates what you like from what you watched, rated and opened. Recent activity counts more.",
    every: DAY,
    firstRunAfter: 5 * MIN,
    run: updateTaste,
  },
  {
    id: "maintenance",
    name: "Tidy the database",
    description: "Removes stale cache, unused titles and old logs.",
    every: DAY,
    firstRunAfter: HOUR,
    run: maintenance,
  },
  {
    id: "backup",
    name: "Back up your data",
    description: "Saves a copy of your database to data/backups, keeping the last four.",
    every: 7 * DAY,
    firstRunAfter: 30 * MIN,
    run: backup,
  },
  {
    id: "health-check",
    name: "Health check",
    description: "Checks that TMDB and your AI command line still work, and warns you if not.",
    every: 7 * DAY,
    firstRunAfter: 20 * MIN,
    run: health,
  },
];

// ---------------------------------------------------------------- state

const iso = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const parse = (s) => (s ? Date.parse(`${s.replace(" ", "T")}Z`) : null);

function state(job) {
  let row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id);
  if (!row) {
    db.prepare("INSERT INTO jobs (id, enabled, next_run_at) VALUES (?, 1, ?)").run(job.id, iso(Date.now() + job.firstRunAfter));
    row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id);
  }
  return row;
}

let busy = null; // the id of the job running now, so jobs never overlap

export function listJobs() {
  return JOBS.map((job) => {
    const s = state(job);
    return {
      id: job.id,
      name: job.name,
      description: job.description,
      everyHours: job.every / HOUR,
      enabled: Boolean(s.enabled),
      running: busy === job.id,
      lastRunAt: s.last_run_at,
      lastStatus: s.last_status,
      lastMessage: s.last_message,
      lastDurationMs: s.last_duration_ms,
      nextRunAt: s.enabled ? s.next_run_at : null,
    };
  });
}

export function setJobEnabled(id, enabled) {
  const job = JOBS.find((j) => j.id === id);
  if (!job) throw new Error("Unknown job");
  state(job);
  db.prepare("UPDATE jobs SET enabled = ?, next_run_at = COALESCE(next_run_at, ?) WHERE id = ?").run(enabled ? 1 : 0, iso(Date.now() + 5 * MIN), id);
}

/** Run one job now. Throws if another job is already running. Never throws for a job's own failure. */
export async function runJob(id, trigger = "manual") {
  const job = JOBS.find((j) => j.id === id);
  if (!job) throw new Error("Unknown job");
  if (busy) throw new Error(`"${busy}" is running; try again in a moment`);
  state(job);
  busy = id;
  const started = Date.now();
  let status = "ok";
  let message = "";
  let retryIn = job.every;
  try {
    const blocked = job.needs?.();
    if (blocked) {
      status = "skipped";
      message = blocked;
      retryIn = 6 * HOUR;
    } else {
      const out = await job.run();
      if (typeof out === "string") message = out;
      else {
        status = out.status ?? "ok";
        message = out.message ?? "";
      }
    }
  } catch (e) {
    status = "error";
    message = e.message ?? String(e);
    retryIn = Math.min(job.every, 30 * MIN); // try again soon, not tomorrow
  } finally {
    busy = null;
  }
  const duration = Date.now() - started;
  db.prepare(
    `UPDATE jobs SET last_run_at = ?, last_status = ?, last_message = ?, last_duration_ms = ?, next_run_at = ? WHERE id = ?`,
  ).run(iso(started), status, `${trigger === "scheduled" ? "" : `(${trigger}) `}${message}`.slice(0, 400), duration, iso(Date.now() + retryIn), id);
  return { id, status, message, durationMs: duration };
}

/** Run every enabled job that is due, one at a time, in list order. Used by the scheduler and by `run-due`. */
export async function runDueJobs(trigger = "scheduled") {
  const results = [];
  for (const job of JOBS) {
    if (busy) break;
    const s = state(job);
    if (!s.enabled) continue;
    const due = parse(s.next_run_at);
    if (due != null && due > Date.now()) continue;
    results.push(await runJob(job.id, trigger));
  }
  return results;
}

let timer = null;

/** Check for due jobs shortly after start (catch-up) and then every minute while the server runs. */
export function startScheduler() {
  if (timer || process.env.WATCHWISE_SCHEDULER === "off") return;
  const tick = () => runDueJobs().catch(() => {});
  setTimeout(tick, 8000);
  timer = setInterval(tick, MIN);
  timer.unref?.();
}
