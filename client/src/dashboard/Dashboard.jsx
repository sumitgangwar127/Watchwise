import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Compass,
  Home,
  Info,
  Loader2,
  Moon,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { COUNTRIES } from "../data.js";
import { Chip, Glow } from "../ui.jsx";
import Ambient from "../components/Ambient.jsx";
import Logo from "../components/Logo.jsx";
import { useDominantColors } from "../colors.js";
import AlertsBell from "./AlertsBell.jsx";
import Hero from "./Hero.jsx";
import { Card, Row } from "./Row.jsx";
import SchedulesPanel from "./SchedulesPanel.jsx";
import { paletteFor } from "./palette.js";
import { buildModel, experimentalReason } from "./recommend.js";

const TABS = [
  ["home", "Home", Home],
  ["explore", "Explore", Compass],
  ["experimental", "Experimental", Sparkles],
  ["list", "My List", Bookmark],
  ["watched", "Watched", CheckCircle2],
];

function Seats({ live }) {
  return (
    <div className="mt-6 overflow-hidden">
      <div className="flex justify-center gap-2 md:gap-3">
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className="velvet h-10 w-9 shrink-0 rounded-t-2xl shadow-[inset_0_6px_10px_rgba(255,255,255,0.12)] md:h-14 md:w-14"
            style={{ opacity: 0.45 + (i % 3) * 0.12 }}
          />
        ))}
      </div>
      <div className="h-8 bg-gradient-to-b from-velvet/40 to-transparent" />
      <p className="pt-6 text-center text-[11px] tracking-[0.35em] text-white/30">ENJOY THE SHOW</p>
      <p className="px-6 pb-28 pt-3 text-center text-[11px] leading-relaxed text-white/25 md:pb-16">
        {live
          ? "This product uses the TMDB API but is not endorsed or certified by TMDB."
          : "Sample catalog shown. Add a TMDB key to see real titles and posters."}
      </p>
    </div>
  );
}

function Grid({ children }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-5 sm:grid-cols-4 md:grid-cols-5 md:gap-4 md:px-14 lg:grid-cols-6 xl:grid-cols-7">
      {children}
    </div>
  );
}

export default function Dashboard({ status, onRestart, onOpenTitle, saved, hist, catalogApi, intermission, playerStyle, onIntermission }) {
  const { profile, providers } = status;
  const { catalog, refresh, refreshing, message: refreshMsg } = catalogApi;

  // Suggestions rebuild whenever the catalog or the watch history changes
  const model = useMemo(
    () => buildModel(profile, catalog?.items ?? [], hist.items, hist.taste),
    [profile, catalog, hist.items, hist.taste],
  );
  const [tab, setTab] = useState("home");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState(null);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState("");
  const [heroItem, setHeroItem] = useState(null);
  const [showSchedules, setShowSchedules] = useState(false);
  // Bias lighting takes its colors from the featured poster
  const ambient = useDominantColors(heroItem?.poster ?? null, heroItem?.palette ?? ["#a8142d", "#4a0715"]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const country = COUNTRIES.find(([c]) => c === profile.country)?.[1] ?? profile.country;
  const provider = providers.find((p) => p.id === profile.provider)?.name ?? "No AI selected";
  const { mine, genres } = model;
  const openTitle = (t) => onOpenTitle(t.id);

  const explore = model.explorePool.filter(
    (t) =>
      (!genre || t.genres.includes(genre)) && t.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Saved and watched items render from their stored snapshots, enriched from the catalog when present
  const fromCatalog = (s, extra = {}) => ({
    ...(model.explorePool.find((p) => p.id === s.id) ?? {}),
    ...s,
    palette: paletteFor(s.id),
    platforms: model.explorePool.find((p) => p.id === s.id)?.platforms ?? s.platforms ?? [],
    ...extra,
  });
  const myList = saved.items.map((s) => fromCatalog(s));
  const watchedList = hist.items.filter((h) => h.status === "watched").map((h) => fromCatalog(h, { watched: true }));

  const go = (id) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  async function restart() {
    await fetch("/api/reset", { method: "POST" });
    onRestart();
  }

  async function markWatched(t) {
    setToast(`Marked "${t.title}" as watched. Finding more like it…`);
    try {
      const r = await hist.mark(t, "watched");
      setToast(
        r?.added > 0
          ? `"${t.title}" is hidden from suggestions, and ${r.added} new titles like it were added.`
          : `"${t.title}" is hidden from suggestions.`,
      );
    } catch (e) {
      setToast(e.message);
    }
  }

  if (!catalog) {
    return (
      <div className="relative grid min-h-dvh place-items-center">
        <Glow beam={false} />
        <Loader2 className="relative animate-spin text-accent" />
      </div>
    );
  }
  const live = !catalog.sample;

  return (
    <div className="relative min-h-dvh">
      <Glow beam={false} />
      <Ambient colors={ambient} strength={tab === "home" ? 1 : 0.5} />

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          scrolled ? "bg-ink/85 backdrop-blur-xl" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className="flex items-center gap-6 px-5 py-3.5 md:px-14">
          <button onClick={() => go("home")} aria-label="Home">
            <Logo size={30} />
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                  tab === id ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span
              title={
                live
                  ? "Real titles, posters and availability from TMDB for your country."
                  : "Placeholder titles. Add a TMDB key to .env to load the real catalog."
              }
              className={`hidden items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] xl:flex ${
                live ? "border-emerald-400/40 text-emerald-300" : "border-dashed border-accent/40 text-accent"
              }`}
            >
              {live ? <span className="size-1.5 rounded-full bg-emerald-400" /> : <Info size={12} />}
              {live ? "Live · TMDB" : "Sample catalog"}
            </span>
            <AlertsBell onOpenTitle={onOpenTitle} />
            <button
              onClick={onIntermission}
              aria-label="Start intermission (screen saver)"
              title="Intermission (screen saver)"
              className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              <Moon size={16} />
            </button>
            <label className="relative hidden md:block">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (tab !== "explore") setTab("explore");
                }}
                placeholder="Search titles"
                className="w-44 rounded-full border border-edge bg-white/[0.04] py-2 pl-9 pr-4 text-sm outline-none transition focus:w-60 focus:border-accent"
              />
            </label>
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                aria-label="Profile"
                className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent to-amber text-sm font-bold text-ink"
              >
                {country?.[0] ?? "?"}
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-edge bg-panel p-4 text-sm shadow-2xl"
                  >
                    <div className="text-white/45">Country</div>
                    <div className="mb-3">{country}</div>
                    <div className="text-white/45">AI engine</div>
                    <div className="mb-3">{provider}</div>
                    <div className="text-white/45">Watched</div>
                    <div className="mb-3">{watchedList.length} titles shaping your picks</div>
                    <label className="mb-3 block">
                      <span className="text-white/45">Trailer player</span>
                      <select
                        value={playerStyle.style}
                        onChange={(e) => playerStyle.set(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none [color-scheme:dark] focus:border-accent"
                      >
                        <option value="showtime">Home theater (centered screen)</option>
                        <option value="theater">Wide screen (experimental)</option>
                      </select>
                    </label>
                    <label className="mb-3 block">
                      <span className="text-white/45">Intermission after</span>
                      <select
                        value={intermission.minutes}
                        onChange={(e) => intermission.set(Number(e.target.value))}
                        className="mt-1 block w-full rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none [color-scheme:dark] focus:border-accent"
                      >
                        <option value={0}>Never</option>
                        <option value={1}>1 minute idle</option>
                        <option value={3}>3 minutes idle</option>
                        <option value={10}>10 minutes idle</option>
                      </select>
                    </label>
                    {status.tmdb?.configured && (
                      <div className="mb-3">
                        <button
                          onClick={refresh}
                          disabled={refreshing}
                          className="flex items-center gap-2 text-white/70 transition hover:text-white disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                          {refreshing ? "Refreshing catalog…" : "Refresh catalog"}
                        </button>
                        {refreshMsg && <div className="mt-1 text-xs text-white/40">{refreshMsg}</div>}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setMenu(false);
                        setShowSchedules(true);
                      }}
                      className="mb-3 flex items-center gap-2 text-white/70 transition hover:text-white"
                    >
                      <CalendarClock size={14} /> Schedules
                    </button>
                    <button
                      onClick={() => {
                        setMenu(false);
                        onIntermission();
                      }}
                      className="mb-3 flex items-center gap-2 text-white/70 transition hover:text-white"
                    >
                      <Moon size={14} /> Start intermission now
                    </button>
                    <button
                      onClick={restart}
                      className="flex items-center gap-2 text-white/60 transition hover:text-white"
                    >
                      <RotateCcw size={14} /> Restart onboarding
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-transparent via-velvet to-transparent" />
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {tab === "home" && (
            <>
              <Hero items={model.hero} mine={mine} onOpen={openTitle} onWatched={markWatched} onSlide={setHeroItem} />
              <div className="relative -mt-10 space-y-2">
                <Row kicker="Now showing" title="Picked for you" items={model.forYou} mine={mine} onOpen={openTitle} />
                {model.genreRows.map((r) => (
                  <Row
                    key={r.genre}
                    kicker="Because you like"
                    title={r.genre}
                    items={r.items}
                    mine={mine}
                    onOpen={openTitle}
                  />
                ))}
                <Row kicker="Coming attractions" title="New this week" items={model.coming} mine={mine} onOpen={openTitle} />
                <Row kicker="Box office" title="Trending now" items={model.trending} mine={mine} onOpen={openTitle} />
                <Row
                  kicker="The midnight reel"
                  title="Try something different"
                  items={model.experimental.slice(0, 12)}
                  mine={mine}
                  onOpen={openTitle}
                  experimental
                />
              </div>
              <Seats live={live} />
            </>
          )}

          {tab === "explore" && (
            <div className="pb-32 pt-24 md:pt-28">
              <div className="px-5 md:px-14">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Explore</h1>
                <label className="relative mt-5 block md:hidden">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search titles"
                    className="w-full rounded-full border border-edge bg-white/[0.04] py-3 pl-10 pr-4 outline-none focus:border-accent"
                  />
                </label>
                <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
                  <Chip active={!genre} onClick={() => setGenre(null)}>
                    All
                  </Chip>
                  {model.allGenres.map((g, i) => (
                    <Chip key={g} index={i} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                {explore.length ? (
                  <Grid>
                    {explore.map((t, i) => (
                      <Card key={t.id} t={t} index={i} mine={mine} onOpen={openTitle} className="w-full" />
                    ))}
                  </Grid>
                ) : (
                  <p className="px-5 text-white/45 md:px-14">Nothing matches that search.</p>
                )}
              </div>
            </div>
          )}

          {tab === "experimental" && (
            <div className="pb-32 pt-24 md:pt-28">
              <div className="px-5 md:px-14">
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent/80">
                  The midnight reel
                </div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Try something different</h1>
                <p className="mt-3 max-w-xl text-white/55">
                  Picks from genres you haven't explored. Watch one and rate it, and your main feed learns from it.
                </p>
              </div>
              <div className="mt-8">
                <Grid>
                  {model.experimental.map((t, i) => (
                    <div key={t.id}>
                      <Card t={t} index={i} mine={mine} onOpen={openTitle} className="w-full" experimental />
                      <p className="mt-2 text-xs leading-snug text-white/45">{experimentalReason(t, genres)}</p>
                    </div>
                  ))}
                </Grid>
              </div>
            </div>
          )}

          {tab === "list" && (
            <div className="pb-32 pt-24 md:pt-28">
              <div className="px-5 md:px-14">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My List</h1>
              </div>
              <div className="mt-6">
                {myList.length ? (
                  <Grid>
                    {myList.map((t, i) => (
                      <Card key={t.id} t={t} index={i} mine={mine} onOpen={openTitle} className="w-full" />
                    ))}
                  </Grid>
                ) : (
                  <p className="px-5 text-white/45 md:px-14">
                    Nothing saved yet. Open a title and choose "My List".
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "watched" && (
            <div className="pb-32 pt-24 md:pt-28">
              <div className="px-5 md:px-14">
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent/80">Your history</div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Watched</h1>
                <p className="mt-3 max-w-xl text-white/55">
                  Everything you've marked as watched. These never show up in suggestions, and they teach Watchwise
                  what you like. Open one to rate it or undo.
                </p>
              </div>
              <div className="mt-6">
                {watchedList.length ? (
                  <Grid>
                    {watchedList.map((t, i) => (
                      <div key={t.id}>
                        <Card t={t} index={i} mine={mine} onOpen={openTitle} className="w-full" />
                        {t.rating ? (
                          <p className="mt-1.5 text-xs text-accent">{"★".repeat(Math.round(t.rating / 2))}</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-white/35">Not rated</p>
                        )}
                      </div>
                    ))}
                  </Grid>
                ) : (
                  <p className="px-5 text-white/45 md:px-14">
                    Nothing yet. Open a title and press "Watched already", or use the button on the home banner.
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      <AnimatePresence>{showSchedules && <SchedulesPanel onClose={() => setShowSchedules(false)} />}</AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-edge bg-panel/95 px-4 py-3 text-center text-sm shadow-2xl backdrop-blur md:bottom-8"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-edge bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition ${
              tab === id ? "text-accent" : "text-white/45"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
