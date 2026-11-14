import { listCatalog } from "./catalog.js";
import { getDetails } from "./details.js";
import { listHistory, parseTitleId } from "./history.js";

/**
 * The Intermission feed: short stories, facts and moments about titles, built only from verified
 * TMDB data (no invented trivia). Each slide has a kind, a label, content and a still from the film.
 */

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);

const runtime = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

/** First sentences of a synopsis, up to about `max` characters, ending on a full stop. */
function shorten(text, max = 240) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length < 30) return null;
  if (t.length <= max) return t;
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t];
  let out = "";
  for (const s of sentences) {
    if ((out + s).length > max && out) break;
    out += s;
  }
  return (out || t.slice(0, max)).trim();
}

function slidesFor(d) {
  const base = { titleId: d.id, title: d.title, year: d.year };
  const stills = d.stills?.length ? d.stills : d.backdrop ? [d.backdrop] : [];
  const still = (i) => stills[i % Math.max(stills.length, 1)] ?? null;
  const slides = [];

  const story = shorten(d.overview);
  if (story) slides.push({ ...base, kind: "story", label: "The story", text: story, image: still(0) });

  const stats = [];
  if (d.type === "movie") {
    if (d.revenue >= 1e5 && d.budget >= 1e5) stats.push({ big: money(d.revenue), small: `worldwide, from a ${money(d.budget)} budget` });
    else if (d.revenue >= 1e5) stats.push({ big: money(d.revenue), small: "worldwide box office" });
    if (d.runtime) stats.push({ big: runtime(d.runtime), small: "running time" });
  } else {
    if (d.seasons) {
      const y0 = d.releaseDate?.slice(0, 4);
      const y1 = d.status === "Ended" ? d.lastAirDate?.slice(0, 4) : null;
      const span = y0 ? (y1 && y1 !== y0 ? `, ${y0} to ${y1}` : `, since ${y0}`) : "";
      stats.push({ big: `${d.seasons} season${d.seasons > 1 ? "s" : ""}`, small: `${d.episodes} episodes${span}` });
    }
    if (d.runtime) stats.push({ big: `${d.runtime} min`, small: "per episode" });
  }
  if (d.rating > 0 && d.votes >= 100) {
    stats.push({ big: `${d.rating.toFixed(1)} / 10`, small: `from ${d.votes.toLocaleString("en-US")} votes on TMDB` });
  }
  if (stats.length >= 2) slides.push({ ...base, kind: "numbers", label: "By the numbers", stats: stats.slice(0, 3), image: still(1) });

  const people = [];
  if (d.directors?.names?.length) {
    const who = d.directors.names.slice(0, 2).join(" and ");
    people.push(d.directors.label === "Director" ? `Directed by ${who}` : `${d.directors.label} ${who}`);
  }
  for (const c of d.cast.slice(0, 3)) if (c.character) people.push(`${c.name} as ${c.character}`);
  if (d.companies?.length) people.push(`Produced by ${d.companies.join(" · ")}`);
  if (people.length >= 3) slides.push({ ...base, kind: "people", label: "Behind the screen", lines: people.slice(0, 5), image: still(2) });

  if (d.tagline) slides.push({ ...base, kind: "tagline", label: "The tagline", text: `“${d.tagline.replace(/[“”"]/g, "")}”`, image: still(3) });
  if (d.collection) slides.push({ ...base, kind: "fact", label: "Did you know", text: `${d.title} is part of ${/^the /i.test(d.collection) ? "" : "the "}${d.collection}.`, image: still(4) });

  if (stills.length >= 2) slides.push({ ...base, kind: "moment", label: "A moment from", text: d.title, image: still(5) });
  return slides;
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const dayHash = (s) => [...`${s}${new Date().toDateString()}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

let cache = { at: 0, region: "", slides: [] };

export async function buildIntermission(region) {
  if (cache.region === region && Date.now() - cache.at < 30 * 60 * 1000 && cache.slides.length) return cache.slides;

  // Titles you've watched and liked first, then what's popular in your catalog today
  const liked = listHistory()
    .filter((h) => h.status === "watched" && (h.rating == null || h.rating >= 6))
    .map((h) => h.id)
    .slice(0, 3);
  const popular = listCatalog(region)
    .sort((a, b) => b.trend - a.trend)
    .slice(0, 30)
    .sort((a, b) => dayHash(a.id) - dayHash(b.id))
    .map((t) => t.id)
    .slice(0, 7);
  const ids = [...new Set([...liked, ...popular])].slice(0, 9);

  const details = await pool(ids, 4, async (id) => {
    const p = parseTitleId(id);
    if (!p) return null;
    try {
      return await getDetails(p.type, p.tmdbId, region);
    } catch {
      return null;
    }
  });

  // Interleave titles so neighbouring slides are about different films, and rotate each title's
  // slides so neighbouring slides are also different kinds (a story, then numbers, then a moment...)
  const perTitle = details
    .filter(Boolean)
    .map(slidesFor)
    .map((list, i) => (list.length ? [...list.slice(i % list.length), ...list.slice(0, i % list.length)] : list));
  const slides = [];
  for (let k = 0; k < 8; k++) for (const list of perTitle) if (list[k]) slides.push({ key: `${list[k].titleId}-${list[k].kind}`, ...list[k] });

  cache = { at: Date.now(), region, slides: slides.slice(0, 40) };
  return cache.slides;
}
