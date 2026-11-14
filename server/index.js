import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ingestRecommendations, listCatalog, refreshCatalog } from "./catalog.js";
import { counts, db, getProfile, setProfile } from "./db.js";
import { getDetails } from "./details.js";
import { listAlerts, markRead, unreadCount } from "./alerts.js";
import { buildIntermission } from "./intermission.js";
import { listJobs, runJob, setJobEnabled, startScheduler } from "./jobs.js";
import { latestTaste, saveTaste } from "./taste.js";
import { clearEvents, eventCount, recordEvent } from "./usage.js";
import { listHistory, parseTitleId, removeHistory, setHistory } from "./history.js";
import { PROVIDERS, detectProviders, verifyProvider } from "./providers/index.js";
import { tmdbConfigured } from "./tmdb.js";

const PORT = Number(process.env.WATCHWISE_API_PORT ?? 3001);
const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/status", (c) => {
  const profile = getProfile();
  return c.json({
    app: "watchwise",
    onboarded: Boolean(profile.onboarded),
    profile,
    counts: counts(),
    providers: detectProviders(),
    tmdb: { configured: tmdbConfigured() },
  });
});

const cleanList = (v, max) =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string")
        .map((x) => x.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, max)
    : [];

// Step 1: save the answers from the onboarding questions.
app.post("/api/onboarding", async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || typeof b.country !== "string" || !/^[A-Za-z]{2}$/.test(b.country)) {
    return c.json({ error: "A two-letter country code is required" }, 400);
  }
  const provider = PROVIDERS.some((p) => p.id === b.provider) ? b.provider : null;

  setProfile("country", b.country.toUpperCase());
  setProfile("platforms", cleanList(b.platforms, 30));
  setProfile("provider", provider);
  setProfile("genres", cleanList(b.genres, 30));
  setProfile("favorites", cleanList(b.favorites, 50));
  // Raw pasted history. Titles are matched to the catalog later.
  setProfile("pending_history", cleanList(b.history, 500));
  return c.json({ ok: true });
});

// Step 2: finish onboarding. Verifies the chosen AI CLI and builds the first catalog from TMDB.
app.post("/api/onboarding/build", async (c) => {
  const profile = getProfile();
  if (!profile.country) return c.json({ error: "Complete the questions first" }, 400);

  const provider = profile.provider ? verifyProvider(profile.provider) : null;

  let catalog = null;
  let catalogError = null;
  if (tmdbConfigured()) {
    try {
      catalog = await refreshCatalog("onboarding");
    } catch (e) {
      catalogError = e.message;
    }
  } else {
    catalogError = "TMDB is not configured. Add TMDB_ACCESS_TOKEN to .env";
  }

  setProfile("onboarded", true);
  return c.json({ ok: true, provider, catalog, catalogError });
});

// The catalog for the user's country, with posters and where each title streams.
app.get("/api/catalog", (c) => {
  const { country } = getProfile();
  return c.json({ items: country ? listCatalog(country) : [] });
});

app.post("/api/catalog/refresh", async (c) => {
  if (!tmdbConfigured()) return c.json({ error: "TMDB is not configured. Add TMDB_ACCESS_TOKEN to .env" }, 400);
  try {
    return c.json({ ok: true, ...(await refreshCatalog("manual")) });
  } catch (e) {
    return c.json({ error: e.message }, 502);
  }
});

// Full detail page data for one title (cast, trailer, runtime, where to watch, similar).
app.get("/api/title/:type/:id", async (c) => {
  const parsed = parseTitleId(`${c.req.param("type")}-${c.req.param("id")}`);
  if (!parsed) return c.json({ error: "Unknown title" }, 400);
  if (!tmdbConfigured()) return c.json({ error: "TMDB is not configured. Add TMDB_ACCESS_TOKEN to .env" }, 400);
  try {
    return c.json(await getDetails(parsed.type, parsed.tmdbId, getProfile().country ?? "US"));
  } catch (e) {
    return c.json({ error: e.status === 404 ? "Title not found" : e.message }, e.status === 404 ? 404 : 502);
  }
});

// Stories, facts and moments for the Intermission (screen saver), from verified TMDB data only.
app.get("/api/intermission", async (c) => {
  if (!tmdbConfigured()) return c.json({ slides: [] });
  try {
    return c.json({ slides: await buildIntermission(getProfile().country ?? "US") });
  } catch {
    return c.json({ slides: [] });
  }
});

// Watch history (watched, dropped, not interested). Feeds the recommendations.
app.get("/api/history", (c) => c.json({ items: listHistory() }));

app.post("/api/history", async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || typeof b.status !== "string") {
    return c.json({ error: "id and status are required" }, 400);
  }
  const rating = b.rating === undefined || b.rating === null ? null : Number(b.rating);
  try {
    const { type, tmdbId } = await setHistory(b.id, b.status, rating);
    saveTaste(); // your taste updates the moment you mark something
    // Learn from it: a watched title that wasn't disliked brings in similar new titles.
    let added = 0;
    if (b.status === "watched" && (rating === null || rating >= 6)) {
      try {
        added = (await ingestRecommendations(type, tmdbId)).added;
      } catch {
        /* the mark itself is saved; similar titles can be fetched next refresh */
      }
    }
    return c.json({ ok: true, added });
  } catch (e) {
    const noKey = e.status === 0;
    return c.json({ error: noKey ? "Add a TMDB key to .env to track watch history" : e.message }, noKey ? 400 : 400);
  }
});

app.delete("/api/history/:id", (c) => {
  try {
    // ?only=watchlist lets "remove from My List" never erase a watched entry
    const only = c.req.query("only");
    removeHistory(c.req.param("id"), only === "watchlist" ? "watchlist" : null);
    saveTaste();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

// ---- Scheduled jobs, alerts, usage and taste ----
app.get("/api/jobs", (c) => c.json({ jobs: listJobs() }));

app.patch("/api/jobs/:id", async (c) => {
  const b = await c.req.json().catch(() => null);
  try {
    setJobEnabled(c.req.param("id"), Boolean(b?.enabled));
    return c.json({ ok: true, jobs: listJobs() });
  } catch (e) {
    return c.json({ error: e.message }, 404);
  }
});

app.post("/api/jobs/:id/run", async (c) => {
  try {
    return c.json({ ...(await runJob(c.req.param("id"), "manual")), jobs: listJobs() });
  } catch (e) {
    return c.json({ error: e.message }, e.message.includes("running") ? 409 : 404);
  }
});

app.get("/api/alerts", (c) => c.json({ alerts: listAlerts(), unread: unreadCount() }));
app.post("/api/alerts/read", async (c) => {
  const b = await c.req.json().catch(() => ({}));
  markRead(Number.isInteger(b?.id) ? b.id : null);
  return c.json({ ok: true, unread: unreadCount() });
});

app.post("/api/events", async (c) => {
  const b = await c.req.json().catch(() => null);
  try {
    recordEvent(b?.kind, b?.ref, b?.platform ?? null);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});
app.get("/api/events", (c) => c.json({ count: eventCount() }));
app.delete("/api/events", (c) => {
  clearEvents();
  saveTaste();
  return c.json({ ok: true });
});

app.get("/api/taste", (c) => c.json(latestTaste()));

// Lets you redo onboarding. Clears the profile only; history and catalog are kept.
app.post("/api/reset", (c) => {
  db.exec("DELETE FROM profile");
  return c.json({ ok: true });
});

// The API stays on localhost only. Phones reach it through the web app's proxy.
serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, () => {
  console.log(`Watchwise API listening on http://localhost:${PORT}`);
  startScheduler(); // runs due jobs shortly after start, then every minute (set WATCHWISE_SCHEDULER=off to disable)
});
