import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Info, Star } from "lucide-react";
import { watchUrl } from "../data.js";
import Poster from "../components/Poster.jsx";
import { watchOptions } from "./recommend.js";

/** The "screen": a rotating featured title with ambient light and a marquee frame. */
export default function Hero({ items, mine, onOpen, onWatched }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % items.length), 7500);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;
  const t = items[i % items.length];
  const opts = watchOptions(t, mine);
  const primary = opts.mine[0] ?? opts.others[0];

  return (
    <section className="relative h-[74vh] min-h-[500px] overflow-hidden md:h-[82vh]">
      <AnimatePresence>
        <motion.div
          key={t.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1 }}
        >
          <div
            className="absolute inset-0 animate-kenburns"
            style={{
              background: `radial-gradient(ellipse at 72% 30%, ${t.palette[0]}d0, transparent 62%), linear-gradient(120deg, ${t.palette[1]}, #08060a 88%)`,
            }}
          />
          {t.backdrop && (
            <>
              <img
                src={t.backdrop}
                alt=""
                className="absolute inset-0 size-full animate-kenburns object-cover object-top opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent md:via-ink/55" />
            </>
          )}
          <div className="absolute right-[7%] top-1/2 hidden w-[250px] -translate-y-[44%] animate-float md:block lg:w-[300px]">
            <Poster t={t} className="shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/20" />
          </div>

          <div className="absolute inset-x-0 bottom-0 px-5 pb-14 md:px-14 md:pb-20">
            <div className="max-w-xl">
              <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em]">
                <span className="rounded border border-accent/60 px-2 py-0.5 text-accent">Now showing</span>
                <span className="text-emerald-300">{t.match}% match</span>
                {t.rating > 0 && (
                  <span className="flex items-center gap-1 text-white/70">
                    <Star size={12} className="fill-accent text-accent" /> {t.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                className="text-4xl font-black leading-[1.02] tracking-tight drop-shadow-lg sm:text-6xl"
              >
                {t.title}
              </motion.h1>
              <p className="mt-3 text-sm text-white/65">
                {t.year} · {t.type === "movie" ? "Film" : "Series"} · {t.genres.join(" · ")}
              </p>
              <p className="mt-3 line-clamp-3 max-w-md text-base text-white/80">{t.blurb}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={watchUrl(primary, t.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  style={{ background: primary.color }}
                >
                  <ExternalLink size={16} /> Watch on {primary.name}
                </a>
                <button
                  onClick={() => onOpen(t)}
                  className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20"
                >
                  <Info size={16} /> More info
                </button>
                {onWatched && (
                  <button
                    onClick={() => onWatched(t)}
                    className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-medium backdrop-blur transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
                  >
                    <Check size={16} /> Watched already
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom fade into the page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="absolute bottom-5 right-5 z-10 flex gap-2 md:bottom-8 md:right-14">
        {items.map((x, n) => (
          <button
            key={x.id}
            aria-label={`Show ${x.title}`}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i % items.length ? "w-8 bg-accent" : "w-3 bg-white/30"}`}
          />
        ))}
      </div>
    </section>
  );
}
