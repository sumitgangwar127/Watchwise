import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, ExternalLink, X } from "lucide-react";
import { watchUrl } from "../data.js";
import Poster from "../components/Poster.jsx";
import { experimentalReason, watchOptions } from "./recommend.js";

const join = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a.at(-1)}` : a[0]);

/** Lights-down detail view with "Watch on" links that open the right platform. */
export default function TitleModal({ t, mine, genres, saved, onSave, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const opts = watchOptions(t, mine);
  const overlap = t.genres.filter((g) => genres.includes(g));
  const why = overlap.length ? `Because you like ${join(overlap)}.` : experimentalReason(t, genres);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_top,rgba(255,238,205,0.18),transparent_65%)]" />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        initial={{ y: 70, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-edge bg-panel shadow-2xl md:max-w-3xl md:rounded-3xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-black/50 backdrop-blur transition hover:bg-black/70"
        >
          <X size={18} />
        </button>

        <div
          className="relative h-40 md:h-56"
          style={{
            background: `radial-gradient(ellipse at 75% 20%, ${t.palette[0]}cc, transparent 65%), linear-gradient(120deg, ${t.palette[1]}, #120d12)`,
          }}
        >
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-panel to-transparent" />
        </div>

        <div className="relative -mt-20 flex gap-5 px-5 md:-mt-28 md:px-8">
          <Poster t={t} showTitle={false} className="w-28 shrink-0 shadow-2xl ring-1 ring-white/20 md:w-40" />
          <div className="self-end pb-1">
            <h2 className="text-2xl font-black leading-tight tracking-tight md:text-4xl">{t.title}</h2>
            <p className="mt-1.5 text-sm text-white/60">
              {t.year} · {t.type === "movie" ? "Film" : "Series"} ·{" "}
              <span className="text-emerald-300">{t.match}% match</span>
            </p>
          </div>
        </div>

        <div className="px-5 pb-8 pt-5 md:px-8">
          <div className="flex flex-wrap gap-2">
            {t.genres.map((g) => (
              <span key={g} className="rounded-full border border-edge px-3 py-1 text-xs text-white/70">
                {g}
              </span>
            ))}
          </div>
          <p className="mt-4 text-white/80">{t.blurb}</p>
          <p className="mt-3 rounded-xl border border-dashed border-accent/40 bg-accent/[0.06] px-4 py-3 text-sm text-accent">
            {why}
          </p>

          <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.25em] text-white/45">
            {opts.mine.length ? "Watch on your apps" : "Available on"}
          </h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {(opts.mine.length ? opts.mine : opts.others).map((p) => (
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

          {opts.mine.length > 0 && opts.others.length > 0 && (
            <>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/45">Also on</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {opts.others.map((p) => (
                  <a
                    key={p.id}
                    href={watchUrl(p, t.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-edge px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              onClick={() => onSave(t.id)}
              className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              {saved ? <BookmarkCheck size={17} className="text-accent" /> : <Bookmark size={17} />}
              {saved ? "In My List" : "Add to My List"}
            </button>
            <p className="max-w-[16rem] text-right text-[11px] leading-snug text-white/30">
              Sample catalog: availability is illustrative. Links open the platform's own site.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
