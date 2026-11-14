import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { listCatalog, refreshCatalog } from "./catalog.js";
import { counts, db, getProfile, setProfile } from "./db.js";
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

// Lets you redo onboarding. Clears the profile only; history and catalog are kept.
app.post("/api/reset", (c) => {
  db.exec("DELETE FROM profile");
  return c.json({ ok: true });
});

// The API stays on localhost only. Phones reach it through the web app's proxy.
serve({ fetch: app.fetch, port: PORT, hostname: "127.0.0.1" }, () => {
  console.log(`Watchwise API listening on http://localhost:${PORT}`);
});
