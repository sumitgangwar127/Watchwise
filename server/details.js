import { db } from "./db.js";
import { mapGenre, ourPlatform } from "./catalog.js";
import { IMG, tmdb } from "./tmdb.js";

const TTL_MS = 24 * 60 * 60 * 1000;
const img = (p, size) => (p ? `${IMG}/${size}${p}` : null);

function certification(type, d, region) {
  for (const code of [region, "US"]) {
    if (type === "movie") {
      const entry = d.release_dates?.results?.find((r) => r.iso_3166_1 === code);
      const c = entry?.release_dates?.find((x) => x.certification)?.certification;
      if (c) return c;
    } else {
      const c = d.content_ratings?.results?.find((r) => r.iso_3166_1 === code)?.rating;
      if (c) return c;
    }
  }
  return null;
}

function pickTrailer(videos = []) {
  const yt = videos.filter((v) => v.site === "YouTube");
  const v =
    yt.find((x) => x.type === "Trailer" && x.official) ??
    yt.find((x) => x.type === "Trailer") ??
    yt.find((x) => x.type === "Teaser");
  return v ? { key: v.key, name: v.name } : null;
}

function providerList(list = []) {
  const seen = new Set();
  return list
    .filter((p) => !seen.has(p.provider_name) && seen.add(p.provider_name))
    .map((p) => ({ name: p.provider_name, platform: ourPlatform(p.provider_name), logo: img(p.logo_path, "w92") }));
}

function shape(type, d, region) {
  const isMovie = type === "movie";
  const date = (isMovie ? d.release_date : d.first_air_date) || null;
  const wp = d["watch/providers"]?.results?.[region] ?? null;

  const tags = [...new Set((d.genres ?? []).flatMap((g) => mapGenre(g.name)))];
  if (d.original_language === "ja" && tags.includes("Animation")) tags.push("Anime");

  const directors = isMovie
    ? { label: "Director", names: (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name) }
    : { label: "Created by", names: (d.created_by ?? []).map((c) => c.name) };

  return {
    id: `${type}-${d.id}`,
    type,
    tmdbId: d.id,
    title: d.title ?? d.name,
    tagline: d.tagline || null,
    overview: d.overview || "",
    year: date ? Number(date.slice(0, 4)) : null,
    releaseDate: date,
    runtime: isMovie ? d.runtime || null : (d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime ?? null),
    seasons: d.number_of_seasons ?? null,
    episodes: d.number_of_episodes ?? null,
    status: d.status ?? null,
    certification: certification(type, d, region),
    rating: d.vote_average ?? null,
    votes: d.vote_count ?? 0,
    genres: (d.genres ?? []).map((g) => g.name),
    tags,
    languages: (d.spoken_languages ?? []).map((l) => l.english_name).filter(Boolean),
    poster: img(d.poster_path, "w500"),
    backdrop: img(d.backdrop_path, "w1280"),
    // Clean stills (no title text), used to colour the Theater player's ambient lighting
    stills: (d.images?.backdrops ?? [])
      .filter((b) => !b.iso_639_1)
      .slice(0, 8)
      .map((b) => img(b.file_path, "w780")),
    trailer: pickTrailer(d.videos?.results),
    cast: (d.credits?.cast ?? []).slice(0, 14).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || null,
      photo: img(c.profile_path, "w185"),
    })),
    directors: directors.names.length ? directors : null,
    similar: (d.recommendations?.results ?? []).slice(0, 14).map((r) => {
      const t = r.media_type === "tv" || r.media_type === "movie" ? r.media_type : type;
      const dt = r.release_date || r.first_air_date;
      return {
        id: `${t}-${r.id}`,
        type: t,
        title: r.title ?? r.name,
        year: dt ? Number(dt.slice(0, 4)) : null,
        poster: img(r.poster_path, "w500"),
        genres: [],
        platforms: [],
      };
    }),
    providers: {
      flatrate: providerList(wp?.flatrate),
      rent: providerList(wp?.rent),
      buy: providerList(wp?.buy),
      link: wp?.link ?? null,
    },
  };
}

/** Full detail for one title. Cached in SQLite for 24 hours per region. */
export async function getDetails(type, tmdbId, region) {
  const row = db
    .prepare("SELECT json, fetched_at FROM title_details WHERE media_type = ? AND tmdb_id = ? AND region = ?")
    .get(type, tmdbId, region);
  if (row && Date.now() - Date.parse(`${row.fetched_at.replace(" ", "T")}Z`) < TTL_MS) {
    const cached = JSON.parse(row.json);
    if (cached.stills !== undefined) return cached; // entries cached before stills existed are refetched
  }

  const append =
    type === "movie"
      ? "credits,videos,recommendations,release_dates,watch/providers,images"
      : "credits,videos,recommendations,content_ratings,watch/providers,images";
  const d = await tmdb(`/${type}/${tmdbId}`, {
    language: "en-US",
    append_to_response: append,
    include_image_language: "en,null",
  });
  const out = shape(type, d, region);

  db.prepare(
    `INSERT INTO title_details (media_type, tmdb_id, region, json) VALUES (?, ?, ?, ?)
     ON CONFLICT(media_type, tmdb_id, region) DO UPDATE SET json = excluded.json, fetched_at = datetime('now')`,
  ).run(type, tmdbId, region, JSON.stringify(out));
  return out;
}
