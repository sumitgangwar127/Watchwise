import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  Loader2,
  Play,
  Star,
} from "lucide-react";
import { COUNTRIES, platformById, watchUrl } from "../data.js";
import { byId } from "../demo.js";
import Logo from "../components/Logo.jsx";
import Poster from "../components/Poster.jsx";
import TrailerPlayer from "../components/TrailerPlayer.jsx";
import { Glow } from "../ui.jsx";
import { Row } from "./Row.jsx";
import { paletteFor } from "./palette.js";
import { matchScore, tasteWeights } from "./recommend.js";

const join = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a.at(-1)}` : (a[0] ?? ""));
const runtime = (m) => (m ? (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`) : null);
const longDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;

function Stars({ value, onRate }) {
  const filled = value ? Math.round(value / 2) : 0;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === filled}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onRate(n)}
          className="p-0.5 transition hover:scale-110"
        >
          <Star size={26} className={n <= filled ? "fill-accent text-accent" : "text-white/25"} />
        </button>
      ))}
    </div>
  );
}

/** A full page for one movie or show: trailer, details, cast, where to watch, similar titles. */
export default function TitlePage({ id, status, saved, hist, navigate, back }) {
  const { profile } = status;
  const mine = profile.platforms ?? [];
  const m = /^(movie|tv)-(\d+)$/.exec(id);
  const sample = m ? null : byId(id);

  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [trailerFrom, setTrailerFrom] = useState(null); // the button's rectangle, so the player can grow out of it
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!m) return;
    let off = false;
    setDetail(null);
    setError("");
    fetch(`/api/title/${m[1]}/${m[2]}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load this title");
        return d;
      })
      .then((d) => !off && setDetail(d))
      .catch((e) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [id]);

  // Sample titles (no TMDB key) get a simpler page built from the bundled data
  const t =
    detail ??
    (sample && {
      id,
      type: sample.type,
      title: sample.title,
      year: sample.year,
      overview: sample.blurb,
      genres: sample.genres,
      tags: sample.genres,
      cast: [],
      similar: [],
      providers: {
        flatrate: sample.platforms.map((p) => ({ name: platformById(p)?.name, platform: p })),
        rent: [],
        buy: [],
        link: null,
      },
    });

  useEffect(() => {
    if (t?.title) document.title = `${t.title} · Watchwise`;
    return () => {
      document.title = "Watchwise";
    };
  }, [t?.title]);

  const entry = hist.get(id);
  const watched = entry?.status === "watched";
  const country = COUNTRIES.find(([c]) => c === profile.country)?.[1] ?? profile.country;

  // ---- loading / error states ----
  if (!t) {
    return (
      <div className="relative grid min-h-dvh place-items-center px-5 text-center">
        <Glow beam={false} />
        <div className="relative">
          {error ? (
            <>
              <p className="text-white/70">{error}</p>
              <button onClick={back} className="mt-4 text-sm text-accent underline">
                Go back
              </button>
            </>
          ) : (
            <Loader2 className="animate-spin text-accent" />
          )}
        </div>
      </div>
    );
  }

  const palette = paletteFor(id);
  const weights = tasteWeights(profile, hist.items);
  const tags = t.tags ?? [];
  const match = matchScore({ id, genres: tags }, weights);
  const overlap = tags.filter((g) => (weights[g] ?? 0) > 0);

  // Where to watch
  const flat = t.providers?.flatrate ?? [];
  const ours = [];
  for (const p of flat) {
    const plat = p.platform && platformById(p.platform);
    if (plat && !ours.some((o) => o.id === plat.id)) ours.push({ ...plat, logo: p.logo });
  }
  const mineOpts = ours.filter((p) => mine.includes(p.id));
  const otherOpts = ours.filter((p) => !mine.includes(p.id));
  const otherNames = flat.filter((p) => !p.platform);
  const rentBuy = [...(t.providers?.rent ?? []), ...(t.providers?.buy ?? [])].filter(
    (p, i, a) => a.findIndex((x) => x.name === p.name) === i,
  );
  const primary = mineOpts[0] ?? otherOpts[0];
  const tmdbLink = t.providers?.link;

  const snap = {
    id,
    type: t.type,
    title: t.title,
    year: t.year,
    poster: t.poster ?? null,
    backdrop: t.backdrop ?? null,
    genres: tags,
    platforms: ours.map((o) => o.id),
    blurb: t.overview,
    rating: t.rating ?? null,
    released: t.releaseDate ?? null,
  };

  async function toggleWatched() {
    setBusy(true);
    setNote("");
    try {
      if (watched) {
        await hist.unmark(id);
        setNote("Removed from your watch history.");
      } else {
        const r = await hist.mark(snap, "watched");
        setNote(
          r?.added > 0
            ? `Saved. It's hidden from your suggestions, and ${r.added} new titles like it were added for you.`
            : "Saved. It's hidden from your suggestions and your picks will adjust.",
        );
      }
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function rate(n) {
    setNote("");
    try {
      await hist.mark(snap, "watched", n * 2);
      setNote(n >= 4 ? "Thanks. We'll look for more like this." : n <= 2 ? "Noted. We'll show less like this." : "Noted.");
    } catch (e) {
      setNote(e.message);
    }
  }

  const facts = [
    ["Released", longDate(t.releaseDate)],
    t.seasons ? ["Seasons", `${t.seasons} · ${t.episodes} episodes`] : null,
    ["Runtime", runtime(t.runtime) && (t.type === "tv" ? `${runtime(t.runtime)} per episode` : runtime(t.runtime))],
    t.directors ? [t.directors.label, t.directors.names.join(", ")] : null,
    ["Status", t.status],
    ["Language", t.languages?.length ? t.languages.join(", ") : null],
  ].filter((f) => f && f[1]);

  return (
    <div className="relative min-h-dvh pb-24">
      <Glow beam={false} />

      <header className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 to-transparent">
        <div className="flex items-center gap-4 px-5 py-3.5 md:px-14">
          <button
            onClick={back}
            aria-label="Back"
            className="grid size-10 place-items-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/70"
          >
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => navigate("/")} aria-label="Home">
            <Logo size={30} />
          </button>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-transparent via-velvet to-transparent" />
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 75% 20%, ${palette[0]}b0, transparent 62%), linear-gradient(120deg, ${palette[1]}, #08060a 85%)`,
          }}
        />
        {t.backdrop && (
          <>
            <img src={t.backdrop} alt="" className="absolute inset-0 size-full object-cover object-top opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-transparent" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-5 pb-12 pt-28 md:flex-row md:items-end md:gap-10 md:px-14 md:pb-16 md:pt-36">
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="w-36 shrink-0 md:w-60"
          >
            <Poster t={{ ...t, palette }} className="shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/20" />
          </motion.div>

          <div className="min-w-0 max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <span className="rounded border border-accent/60 px-2 py-0.5 text-accent">
                {t.type === "movie" ? "Film" : "Series"}
              </span>
              {!watched && <span className="text-emerald-300">{match}% match</span>}
              {t.rating > 0 && (
                <span className="flex items-center gap-1 text-white/75">
                  <Star size={12} className="fill-accent text-accent" /> {t.rating.toFixed(1)}
                </span>
              )}
              {t.certification && (
                <span className="rounded border border-white/30 px-1.5 py-0.5 text-white/70">{t.certification}</span>
              )}
            </div>

            <h1 className="text-4xl font-black leading-[1.03] tracking-tight drop-shadow-lg sm:text-6xl">{t.title}</h1>
            {t.tagline && <p className="mt-3 text-base italic text-white/65">{t.tagline}</p>}
            <p className="mt-3 text-sm text-white/65">
              {[t.year, runtime(t.runtime) && (t.type === "tv" ? `${runtime(t.runtime)}/ep` : runtime(t.runtime)), t.genres?.join(" · ")]
                .filter(Boolean)
                .join("  ·  ")}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {primary ? (
                <a
                  href={watchUrl(primary, t.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  style={{ background: primary.color }}
                >
                  <ExternalLink size={16} /> Watch on {primary.name}
                </a>
              ) : (
                <a
                  href="#where-to-watch"
                  className="rounded-full bg-white/15 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
                >
                  Where to watch
                </a>
              )}
              {t.trailer && (
                <button
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTrailerFrom({ top: r.top, left: r.left, width: r.width, height: r.height });
                  }}
                  className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20"
                >
                  <Play size={16} className="fill-white" /> Play trailer
                </button>
              )}
              <button
                onClick={toggleWatched}
                disabled={busy}
                aria-pressed={watched}
                className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium backdrop-blur transition disabled:opacity-60 ${
                  watched
                    ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-200"
                    : "border-white/25 bg-white/10 hover:border-emerald-400/60 hover:bg-emerald-500/20"
                }`}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={watched ? 3 : 2} />}
                {watched ? "Watched" : "Watched already"}
              </button>
              <button
                onClick={() => saved.toggle(snap)}
                aria-pressed={saved.isSaved(id)}
                className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20"
              >
                {saved.isSaved(id) ? <BookmarkCheck size={16} className="text-accent" /> : <Bookmark size={16} />}
                {saved.isSaved(id) ? "In My List" : "My List"}
              </button>
            </div>

            <AnimatePresence>
              {watched && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.06] px-4 py-3">
                    <span className="text-sm text-accent">How was it?</span>
                    <Stars value={entry?.rating} onRate={rate} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {note && (
              <p role="status" className="mt-3 max-w-lg text-sm text-white/60">
                {note}
              </p>
            )}
          </div>
        </div>

      </section>

      {/* Cinema trailer player: grows out of the "Play trailer" button and loads YouTube only when opened */}
      <AnimatePresence>
        {trailerFrom && t.trailer && (
          <TrailerPlayer
            key="trailer"
            trailer={t.trailer}
            title={t.title}
            backdrop={t.backdrop}
            from={trailerFrom}
            cta={primary ? { label: `Watch on ${primary.name}`, href: watchUrl(primary, t.title), color: primary.color } : null}
            onClose={() => setTrailerFrom(null)}
          />
        )}
      </AnimatePresence>

      {/* Details */}
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-[1fr_300px] md:gap-14 md:px-14">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/80">Overview</h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">{t.overview || "No description available."}</p>
            {!watched && (
              <p className="mt-4 rounded-xl border border-dashed border-accent/40 bg-accent/[0.06] px-4 py-3 text-sm text-accent">
                {overlap.length
                  ? `Because you like ${join(overlap.slice(0, 3))}.`
                  : `Experimental pick: ${tags[0] ?? "this genre"} is outside your usual genres.`}
              </p>
            )}
          </section>

          <section id="where-to-watch" className="scroll-mt-24">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/80">
              Where to watch in {country}
            </h2>

            {mineOpts.length > 0 ? (
              <>
                <p className="mt-3 text-sm text-white/55">On your apps</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {mineOpts.map((p) => (
                    <a
                      key={p.id}
                      href={watchUrl(p, t.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                      style={{ background: p.color }}
                    >
                      <ExternalLink size={15} /> Watch on {p.name}
                    </a>
                  ))}
                </div>
              </>
            ) : flat.length > 0 ? (
              <p className="mt-3 text-sm text-white/55">It's not on any of your apps. It's streaming on:</p>
            ) : (
              <p className="mt-3 text-sm text-white/55">
                Not on any subscription service in {country} right now.
              </p>
            )}

            {(otherOpts.length > 0 || otherNames.length > 0) && (
              <>
                <p className="mt-5 text-sm text-white/55">{mineOpts.length ? "Also streaming on" : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {otherOpts.map((p) => (
                    <a
                      key={p.id}
                      href={watchUrl(p, t.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-edge px-4 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white"
                    >
                      {p.name}
                    </a>
                  ))}
                  {otherNames.map((p) => (
                    <a
                      key={p.name}
                      href={tmdbLink ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-edge px-4 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white"
                    >
                      {p.name}
                    </a>
                  ))}
                </div>
              </>
            )}

            {rentBuy.length > 0 && (
              <>
                <p className="mt-5 text-sm text-white/55">Rent or buy</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rentBuy.map((p) => (
                    <a
                      key={p.name}
                      href={tmdbLink ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-edge px-4 py-2 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
                    >
                      {p.name}
                    </a>
                  ))}
                </div>
              </>
            )}

            <p className="mt-5 text-xs leading-relaxed text-white/35">
              {tmdbLink ? (
                <>
                  Availability from TMDB.{" "}
                  <a href={tmdbLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                    All ways to watch
                  </a>
                  .{" "}
                </>
              ) : (
                "Sample title: availability is illustrative. "
              )}
              Platform buttons open that platform's own site.
            </p>
          </section>

          {t.cast?.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/80">Cast</h2>
              <div className="no-scrollbar -mx-5 mt-4 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
                {t.cast.map((c) => (
                  <div key={c.id} className="w-24 shrink-0 text-center">
                    {c.photo ? (
                      <img
                        src={c.photo}
                        alt={c.name}
                        loading="lazy"
                        className="mx-auto size-20 rounded-full object-cover ring-1 ring-white/15"
                      />
                    ) : (
                      <div className="mx-auto grid size-20 place-items-center rounded-full bg-panel text-xl font-bold text-accent ring-1 ring-white/15">
                        {c.name[0]}
                      </div>
                    )}
                    <div className="mt-2 line-clamp-2 text-xs font-medium leading-tight">{c.name}</div>
                    {c.character && (
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-white/40">{c.character}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-accent/80">Details</h2>
          <dl className="mt-4 divide-y divide-edge rounded-2xl border border-edge bg-panel/60 px-4 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="py-3">
                <dt className="text-xs text-white/40">{k}</dt>
                <dd className="mt-0.5 text-white/85">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      {t.similar?.length > 0 && (
        <div className="relative pt-4">
          <Row
            kicker="Keep the reel rolling"
            title="More like this"
            items={t.similar.map((s) => ({ ...s, palette: paletteFor(s.id), watched: hist.get(s.id)?.status === "watched" }))}
            mine={mine}
            onOpen={(s) => navigate(`/title/${encodeURIComponent(s.id)}`)}
          />
        </div>
      )}

      <p className="px-6 pt-8 text-center text-[11px] leading-relaxed text-white/25">
        {detail
          ? "This product uses the TMDB API but is not endorsed or certified by TMDB."
          : "Sample title. Add a TMDB key for full details."}
      </p>
    </div>
  );
}
