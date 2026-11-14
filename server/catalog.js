import { db, getProfile } from "./db.js";
import { IMG, tmdb } from "./tmdb.js";

// TMDB provider names → Watchwise platform ids (matched by name, so no hardcoded provider ids).
const NAME_MAP = [
  ["netflix", /netflix/i],
  ["prime", /amazon prime|prime video/i],
  ["disney", /disney/i],
  ["apple", /apple tv/i],
  ["hotstar", /hotstar/i],
  ["jiocinema", /jio ?cinema/i],
  ["max", /^max$|hbo max/i],
  ["hulu", /^hulu$/i],
  ["peacock", /peacock/i],
  ["paramount", /paramount/i],
  ["sonyliv", /sony ?liv/i],
  ["zee5", /zee ?5/i],
  ["youtube", /^youtube$/i],
  ["mubi", /^mubi$/i],
  ["crunchyroll", /crunchyroll/i],
  ["bbc", /bbc iplayer/i],
  ["itvx", /itvx/i],
  ["crave", /^crave$/i],
  ["stan", /^stan$/i],
  ["viki", /viki/i],
  ["tving", /tving/i],
  ["unext", /u-?next/i],
];
export const ourPlatform = (name) => NAME_MAP.find(([, re]) => re.test(name))?.[0] ?? null;

const GENRE_TABLE = {
  "science fiction": ["Sci-Fi"],
  "sci-fi & fantasy": ["Sci-Fi", "Fantasy"],
  "action & adventure": ["Action", "Adventure"],
  "war & politics": ["War"],
  kids: ["Family"],
  music: ["Musical"],
  history: ["Historical"],
};
const OUR_GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Horror", "Mystery", "Reality", "Romance", "Thriller", "War", "Western"];
export const mapGenre = (name) => {
  const n = name.toLowerCase();
  if (n in GENRE_TABLE) return GENRE_TABLE[n];
  const hit = OUR_GENRES.find((g) => g.toLowerCase() === n);
  return hit ? [hit] : [];
};

let genreCache = null;
export async function genreMaps() {
  if (genreCache) return genreCache;
  const maps = { id2names: { movie: {}, tv: {} }, name2ids: { movie: {}, tv: {} } };
  for (const type of ["movie", "tv"]) {
    const { genres } = await tmdb(`/genre/${type}/list`, { language: "en-US" });
    for (const g of genres) {
      const names = mapGenre(g.name);
      maps.id2names[type][g.id] = names;
      for (const n of names) (maps.name2ids[type][n] ??= []).push(g.id);
    }
  }
  return (genreCache = maps);
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function providerIdsFor(region, ourIds) {
  const ids = new Set();
  for (const type of ["movie", "tv"]) {
    const { results } = await tmdb(`/watch/providers/${type}`, { watch_region: region, language: "en-US" });
    for (const p of results) {
      const ours = ourPlatform(p.provider_name);
      if (ours && ourIds.includes(ours)) ids.add(p.provider_id);
    }
  }
  return [...ids];
}

async function collect(region, providerIds, genres, maps) {
  const base = {
    watch_region: region,
    with_watch_monetization_types: "flatrate",
    sort_by: "popularity.desc",
    "vote_count.gte": 150,
    include_adult: false,
    language: "en-US",
  };
  if (providerIds.length) base.with_watch_providers = providerIds.join("|");

  const jobs = [];
  for (const type of ["movie", "tv"]) {
    for (const page of [1, 2, 3]) jobs.push([type, { ...base, page }]);
    // Extra pages focused on the user's own genres
    for (const g of genres.slice(0, 3)) {
      const ids = maps.name2ids[type][g];
      if (ids?.length) jobs.push([type, { ...base, with_genres: ids.join("|"), page: 1 }]);
    }
  }
  const batches = await pool(jobs, 4, async ([type, params]) =>
    (await tmdb(`/discover/${type}`, params)).results.map((r) => ({ ...r, media_type: type })),
  );

  const seen = new Map();
  for (const r of batches.flat()) {
    const key = `${r.media_type}:${r.id}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  return [...seen.values()];
}

/** Insert or update TMDB result rows in `titles`. Synchronous inside one transaction. */
function upsertFound(found, maps, run) {
  const find = db.prepare("SELECT id FROM titles WHERE media_type = ? AND tmdb_id = ?");
  const insert = db.prepare(
    `INSERT INTO titles (tmdb_id, media_type, title, year, overview, genres, poster_url, backdrop_url, rating, trend_score, release_date, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const update = db.prepare(
    `UPDATE titles SET title = ?, year = ?, overview = ?, genres = ?, poster_url = ?, backdrop_url = ?, rating = ?,
     trend_score = ?, release_date = ?, language = ?, last_seen = datetime('now') WHERE id = ?`,
  );
  const logChange = db.prepare("INSERT INTO change_log (run_id, title_id, action, detail) VALUES (?, ?, ?, ?)");

  let added = 0;
  let updated = 0;
  const rows = [];

  db.exec("BEGIN");
  try {
    for (const r of found) {
      const type = r.media_type;
      const title = r.title ?? r.name;
      if (!title) continue;
      const date = r.release_date || r.first_air_date || null;
      const names = [...new Set((r.genre_ids ?? []).flatMap((id) => maps.id2names[type][id] ?? []))];
      if (r.original_language === "ja" && names.includes("Animation")) names.push("Anime");

      const values = [
        title,
        date ? Number(date.slice(0, 4)) : null,
        r.overview || null,
        JSON.stringify(names),
        r.poster_path ? `${IMG}/w500${r.poster_path}` : null,
        r.backdrop_path ? `${IMG}/w1280${r.backdrop_path}` : null,
        r.vote_average ?? null,
        r.popularity ?? 0,
        date,
        r.original_language ?? null,
      ];
      const existing = find.get(type, r.id);
      let id;
      if (existing) {
        update.run(...values, existing.id);
        id = existing.id;
        updated++;
      } else {
        id = Number(insert.run(r.id, type, ...values).lastInsertRowid);
        logChange.run(run, id, "added", title);
        added++;
      }
      rows.push({ id, type, tmdbId: r.id });
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { rows, added, updated };
}

/** Fetch where each title streams in `region` and replace its availability rows. */
async function syncAvailability(rows, region, run) {
  const getAv = db.prepare("SELECT platform FROM availability WHERE title_id = ? AND region = ?");
  const delAv = db.prepare("DELETE FROM availability WHERE title_id = ? AND region = ?");
  const putAv = db.prepare(
    "INSERT OR REPLACE INTO availability (title_id, region, platform, kind, link) VALUES (?, ?, ?, 'stream', ?)",
  );
  const logChange = db.prepare("INSERT INTO change_log (run_id, title_id, action, detail) VALUES (?, ?, ?, ?)");

  const fetched = await pool(rows, 6, async (row) => {
    try {
      const res = await tmdb(`/${row.type}/${row.tmdbId}/watch/providers`);
      const entry = res.results?.[region];
      const ours = [...new Set((entry?.flatrate ?? []).map((p) => ourPlatform(p.provider_name)).filter(Boolean))];
      return { row, ours, link: entry?.link ?? null };
    } catch {
      return null; // skip this title's availability, keep the rest
    }
  });

  db.exec("BEGIN");
  try {
    for (const f of fetched) {
      if (!f) continue;
      const before = getAv.all(f.row.id, region).map((a) => a.platform);
      delAv.run(f.row.id, region);
      for (const p of f.ours) putAv.run(f.row.id, region, p, f.link);
      for (const gone of before.filter((p) => !f.ours.includes(p))) {
        logChange.run(run, f.row.id, "removed_from_platform", gone);
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

const startRun = (kind) =>
  db.prepare("INSERT INTO runs (kind, provider, status) VALUES (?, 'tmdb', 'running')").run(kind).lastInsertRowid;
const finishRun = (run, status, added = 0, updated = 0) =>
  db
    .prepare("UPDATE runs SET status = ?, added = ?, updated = ?, finished_at = datetime('now') WHERE id = ?")
    .run(status, added, updated, run);

let running = null;

/**
 * Pulls titles available on the user's platforms in their country from TMDB and
 * upserts them with posters and per-platform availability. Incremental: existing
 * titles are updated, new ones added, and platforms a title left are logged.
 */
export function refreshCatalog(kind = "manual") {
  if (!running) running = doRefresh(kind).finally(() => (running = null));
  return running;
}

async function doRefresh(kind) {
  const profile = getProfile();
  const region = profile.country;
  if (!region) throw new Error("Complete onboarding first");
  const platforms = profile.platforms ?? [];
  const genres = profile.genres ?? [];

  const run = startRun(kind);
  try {
    const maps = await genreMaps();
    const providerIds = await providerIdsFor(region, platforms);
    const found = await collect(region, providerIds, genres, maps);
    const { rows, added, updated } = upsertFound(found, maps, run);
    await syncAvailability(rows, region, run);
    finishRun(run, "ok", added, updated);
    return { added, updated, total: found.length, region, providers: providerIds.length };
  } catch (e) {
    finishRun(run, "error");
    throw e;
  }
}

/**
 * Learning step: when the user marks a title as watched, pull TMDB's "similar to this"
 * titles into the catalog so removed suggestions get replaced with fresh ones.
 */
export async function ingestRecommendations(type, tmdbId) {
  const region = getProfile().country;
  if (!region) return { added: 0 };
  const run = startRun("learn");
  try {
    const maps = await genreMaps();
    const res = await tmdb(`/${type}/${tmdbId}/recommendations`, { language: "en-US", page: 1 });
    const found = (res.results ?? []).slice(0, 16).map((r) => ({ ...r, media_type: type }));
    const { rows, added, updated } = upsertFound(found, maps, run);
    await syncAvailability(rows, region, run);
    finishRun(run, "ok", added, updated);
    return { added };
  } catch (e) {
    finishRun(run, "error");
    throw e;
  }
}

/** Make sure a title exists in `titles` (fetching it from TMDB if needed). Returns its row id. */
export async function ensureTitle(type, tmdbId) {
  const existing = db.prepare("SELECT id FROM titles WHERE media_type = ? AND tmdb_id = ?").get(type, tmdbId);
  if (existing) return existing.id;
  const d = await tmdb(`/${type}/${tmdbId}`, { language: "en-US" });
  const maps = await genreMaps();
  const { rows } = upsertFound([{ ...d, media_type: type, genre_ids: (d.genres ?? []).map((g) => g.id) }], maps, null);
  return rows[0].id;
}

/** Titles available in the region, shaped for the web app. */
export function listCatalog(region) {
  const byTitle = new Map();
  for (const a of db.prepare("SELECT title_id, platform, link FROM availability WHERE region = ?").all(region)) {
    if (!byTitle.has(a.title_id)) byTitle.set(a.title_id, []);
    byTitle.get(a.title_id).push(a);
  }
  return db
    .prepare("SELECT * FROM titles")
    .all()
    .filter((t) => byTitle.has(t.id))
    .map((t) => ({
      id: `${t.media_type}-${t.tmdb_id}`,
      title: t.title,
      year: t.year,
      type: t.media_type === "movie" ? "movie" : "tv",
      genres: JSON.parse(t.genres),
      blurb: t.overview ?? "",
      poster: t.poster_url,
      backdrop: t.backdrop_url,
      rating: t.rating,
      trend: t.trend_score,
      released: t.release_date,
      platforms: byTitle.get(t.id).map((a) => a.platform),
      link: byTitle.get(t.id)[0].link,
    }));
}
