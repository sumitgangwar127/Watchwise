import { DEMO } from "../demo.js";
import { platformById } from "../data.js";

const hash = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

/** Placeholder scoring from genre overlap. The real engine (AI + rules files) replaces this. */
export function matchScore(t, genres) {
  const overlap = t.genres.filter((g) => genres.includes(g)).length;
  return Math.min(99, 56 + overlap * 14 + (overlap ? 6 : 0) + (hash(t.id) % 7));
}

/** Platform objects for a title, split into the user's apps and the rest. */
export function watchOptions(t, mine) {
  const all = t.platforms.map(platformById).filter(Boolean);
  return {
    mine: all.filter((p) => mine.includes(p.id)),
    others: all.filter((p) => !mine.includes(p.id)),
  };
}

export function buildModel(profile) {
  const country = profile.country;
  const mine = profile.platforms ?? [];
  const genres = profile.genres ?? [];

  const inRegion = DEMO.filter((t) => !t.regions || t.regions.includes(country));
  let pool = inRegion.filter((t) => t.platforms.some((p) => mine.includes(p)));
  if (pool.length < 8) pool = inRegion;
  pool = pool.map((t) => ({ ...t, match: matchScore(t, genres) }));

  const byMatch = [...pool].sort((a, b) => b.match - a.match);
  const overlaps = (t) => t.genres.some((g) => genres.includes(g));

  const genreRows = genres
    .slice(0, 2)
    .map((g) => ({ genre: g, items: byMatch.filter((t) => t.genres.includes(g)) }))
    .filter((r) => r.items.length >= 3);

  const experimental = pool.filter((t) => !overlaps(t)).sort((a, b) => hash(a.id) - hash(b.id));

  return {
    mine,
    genres,
    pool,
    hero: byMatch.slice(0, 5),
    forYou: byMatch.slice(0, 14),
    genreRows,
    trending: [...pool].sort((a, b) => (hash(a.id) % 11) - (hash(b.id) % 11)).slice(0, 14),
    coming: pool.filter((t) => t.new),
    experimental,
    allGenres: [...new Set(pool.flatMap((t) => t.genres))].sort(),
  };
}

export function experimentalReason(t, genres) {
  const liked = genres[0];
  return liked
    ? `You haven't explored ${t.genres[0]} yet. A friendly step from your love of ${liked}.`
    : `${t.genres[0]} is new territory for you.`;
}
