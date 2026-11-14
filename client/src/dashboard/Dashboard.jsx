import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Compass, Home, Info, RotateCcw, Search, Sparkles } from "lucide-react";
import { COUNTRIES } from "../data.js";
import { Chip, Glow } from "../ui.jsx";
import Logo from "../components/Logo.jsx";
import Hero from "./Hero.jsx";
import { Card, Row } from "./Row.jsx";
import TitleModal from "./TitleModal.jsx";
import { buildModel, experimentalReason } from "./recommend.js";

const TABS = [
  ["home", "Home", Home],
  ["explore", "Explore", Compass],
  ["experimental", "Experimental", Sparkles],
  ["list", "My List", Bookmark],
];

function useSaved() {
  const [ids, setIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ww_list") ?? "[]");
    } catch {
      return [];
    }
  });
  const toggle = (id) =>
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try {
        localStorage.setItem("ww_list", JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return next;
    });
  return [ids, toggle];
}

function Seats() {
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
      <p className="pb-28 pt-6 text-center text-[11px] tracking-[0.35em] text-white/30 md:pb-16">ENJOY THE SHOW</p>
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

export default function Dashboard({ status, onRestart }) {
  const { profile, providers } = status;
  const model = useMemo(() => buildModel(profile), [profile]);
  const [tab, setTab] = useState("home");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState(null);
  const [open, setOpen] = useState(null);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [saved, toggleSaved] = useSaved();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const country = COUNTRIES.find(([c]) => c === profile.country)?.[1] ?? profile.country;
  const provider = providers.find((p) => p.id === profile.provider)?.name ?? "No AI selected";
  const { mine, genres } = model;

  const explore = model.pool.filter(
    (t) =>
      (!genre || t.genres.includes(genre)) && t.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const myList = model.pool.filter((t) => saved.includes(t.id));

  const go = (id) => {
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  async function restart() {
    await fetch("/api/reset", { method: "POST" });
    onRestart();
  }

  return (
    <div className="relative min-h-dvh">
      <Glow beam={false} />

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
                className={`rounded-full px-4 py-2 text-sm transition ${
                  tab === id ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span
              title="Placeholder titles for design testing. The live catalog comes later."
              className="hidden items-center gap-1.5 rounded-full border border-dashed border-accent/40 px-3 py-1 text-[11px] text-accent sm:flex"
            >
              <Info size={12} /> Sample catalog
            </span>
            <label className="relative hidden md:block">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (tab !== "explore") setTab("explore");
                }}
                placeholder="Search titles"
                className="w-52 rounded-full border border-edge bg-white/[0.04] py-2 pl-9 pr-4 text-sm outline-none transition focus:w-64 focus:border-accent"
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
              <Hero items={model.hero} mine={mine} onOpen={setOpen} />
              <div className="relative -mt-10 space-y-2">
                <Row kicker="Now showing" title="Picked for you" items={model.forYou} mine={mine} onOpen={setOpen} />
                {model.genreRows.map((r) => (
                  <Row
                    key={r.genre}
                    kicker="Because you like"
                    title={r.genre}
                    items={r.items}
                    mine={mine}
                    onOpen={setOpen}
                  />
                ))}
                <Row kicker="Coming attractions" title="New this week" items={model.coming} mine={mine} onOpen={setOpen} />
                <Row kicker="Box office" title="Trending now" items={model.trending} mine={mine} onOpen={setOpen} />
                <Row
                  kicker="The midnight reel"
                  title="Try something different"
                  items={model.experimental.slice(0, 12)}
                  mine={mine}
                  onOpen={setOpen}
                  experimental
                />
              </div>
              <Seats />
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
                      <Card key={t.id} t={t} index={i} mine={mine} onOpen={setOpen} className="w-full" />
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
                      <Card t={t} index={i} mine={mine} onOpen={setOpen} className="w-full" experimental />
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
                      <Card key={t.id} t={t} index={i} mine={mine} onOpen={setOpen} className="w-full" />
                    ))}
                  </Grid>
                ) : (
                  <p className="px-5 text-white/45 md:px-14">
                    Nothing saved yet. Open a title and choose "Add to My List".
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-edge bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
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

      <AnimatePresence>
        {open && (
          <TitleModal
            key={open.id}
            t={open}
            mine={mine}
            genres={genres}
            saved={saved.includes(open.id)}
            onSave={toggleSaved}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
