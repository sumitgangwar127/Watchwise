import { platformById } from "../data.js";
import { isRecent, paletteFor } from "./palette.js";

const hash = (s) => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0);

/**
 * Taste profile as genre weights. Starts from the genres picked in onboarding, then learns
 * from watch history: liked titles boost their genres, disliked or dropped ones lower them.
 * This is a simple placeholder for the AI engine, which will read the same history.
 */
export function tasteWeights(profile, historyItems = []) {
  const w = {};
  for (const g of profile.genres ?? []) w[g] = (w[g] ?? 0) + 2;
  for (const h of historyItems) {
    if (h.status !== "watched" && h.status !== "dropped") continue;
    const r = h.rating;
    const delta = h.status === "dropped" ? -1.5 : r == null ? 1 : r >= 8 ? 2 : r >= 6 ? 1 : r >= 4 ? 0 : -1.5;
    for (const g of h.genres ?? []) w[g] = (w[g] ?? 0) + delta;
  }
  return w;
}

export function matchScore(t, weights) {
  const s = (t.genres ?? []).reduce((a, g) => a + Math.max(-2, Math.min(4, weights[g] ?? 0)), 0);
  return Math.max(30, Math.min(99, Math.round(52 + s * 9 + (hash(t.id) % 7))));
}

/** Platform objects for a title, split into the user's apps and the rest. */
export function watchOptions(t, mine) {
  const all = t.platforms.map(platformById).filter(Boolean);
  return {
    mine: all.filter((p) => mine.includes(p.id)),
    others: all.filter((p) => !mine.includes(p.id)),
  };
}

/** `items` is the live catalog from the API, or the sample titles when there is no catalog yet. */
export function buildModel(profile, items, historyItems = []) {
  const country = profile.country;
  const mine = profile.platforms ?? [];
  const weights = tasteWeights(profile, historyItems);

  // Anything the user has watched, dropped or dismissed never appears in suggestions again
  const hidden = new Set(
    historyItems.filter((h) => ["watched", "dropped", "not_interested"].includes(h.status)).map((h) => h.id),
  );
  const watched = new Set(historyItems.filter((h) => h.status === "watched").map((h) => h.id));

  const inRegion = items
    .filter((t) => !t.regions || t.regions.includes(country))
    .map((t) => ({
      ...t,
      palette: t.palette ?? paletteFor(t.id),
      new: t.new ?? isRecent(t.released),
      match: matchScore(t, weights),
      watched: watched.has(t.id),
    }));

  let visible = inRegion.filter((t) => t.platforms.some((p) => mine.includes(p)));
  if (visible.filter((t) => !hidden.has(t.id)).length < 8) visible = inRegion;
  const pool = visible.filter((t) => !hidden.has(t.id));

  const byMatch = [...pool].sort((a, b) => b.match - a.match);
  const heroPool = byMatch.filter((t) => t.backdrop); // prefer wide backdrop art for the banner

  const topGenres = Object.entries(weights)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const genreRows = topGenres
    .slice(0, 2)
    .map((g) => ({ genre: g, items: byMatch.filter((t) => t.genres.includes(g)) }))
    .filter((r) => r.items.length >= 3);

  const experimental = pool
    .filter((t) => !t.genres.some((g) => (weights[g] ?? 0) > 0))
    .sort((a, b) => hash(a.id) - hash(b.id));

  return {
    mine,
    genres: topGenres,
    weights,
    pool,
    explorePool: visible, // includes watched titles (shown with a check) so search still finds them
    hero: (heroPool.length >= 3 ? heroPool : byMatch).slice(0, 5),
    forYou: byMatch.slice(0, 14),
    genreRows,
    trending: [...pool].sort((a, b) => (hash(a.id) % 11) - (hash(b.id) % 11)).slice(0, 14),
    coming: pool.filter((t) => t.new),
    experimental,
    allGenres: [...new Set(visible.flatMap((t) => t.genres))].sort(),
  };
}

export function experimentalReason(t, genres) {
  const liked = genres[0];
  return liked
    ? `You haven't explored ${t.genres[0]} yet. A friendly step from your love of ${liked}.`
    : `${t.genres[0]} is new territory for you.`;
}
