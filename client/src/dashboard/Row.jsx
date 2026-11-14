import { useRef } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { platformById } from "../data.js";
import Poster from "../components/Poster.jsx";

export function Card({
  t,
  mine,
  onOpen,
  experimental = false,
  index = 0,
  className = "w-[132px] sm:w-[160px] md:w-[184px]",
}) {
  const badges = (t.platforms ?? [])
    .filter((p) => mine.includes(p))
    .slice(0, 2)
    .map(platformById)
    .filter(Boolean);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(t)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -30px 0px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -6, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative shrink-0 snap-start text-left outline-none ${className}`}
    >
      <div className="relative rounded-xl ring-1 ring-white/10 transition group-hover:shadow-[0_18px_50px_-12px_rgba(242,196,109,0.5)] group-hover:ring-accent/70 group-focus-visible:ring-accent">
        <Poster t={t} />
        <div className="absolute left-2 top-2 flex gap-1">
          {badges.map((p) => (
            <span
              key={p.id}
              className="grid h-5 min-w-5 place-items-center rounded px-1 text-[9px] font-black text-white shadow"
              style={{ background: p.color }}
            >
              {p.mono}
            </span>
          ))}
        </div>
        {experimental ? (
          <div className="absolute right-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink">
            New genre
          </div>
        ) : (
          t.match != null && (
            <div className="absolute right-2 top-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 opacity-0 backdrop-blur transition group-hover:opacity-100">
              {t.match}%
            </div>
          )
        )}
        {t.watched && (
          <div
            title="Watched"
            className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-emerald-500 text-ink shadow"
          >
            <Check size={14} strokeWidth={3} />
          </div>
        )}
      </div>
    </motion.button>
  );
}

export function Row({ kicker, title, items, mine, onOpen, experimental = false }) {
  const ref = useRef(null);
  const scroll = (d) =>
    ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: "smooth" });

  if (!items.length) return null;

  return (
    <section className="group/row relative">
      <div className="mb-2 px-5 md:px-14">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent/80">{kicker}</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
      </div>
      <div className="relative">
        {["left", "right"].map((side) => (
          <button
            key={side}
            aria-label={`Scroll ${side}`}
            onClick={() => scroll(side === "left" ? -1 : 1)}
            className={`absolute top-0 z-10 hidden h-[calc(100%-1.5rem)] w-14 place-items-center bg-gradient-to-${side === "left" ? "r" : "l"} from-ink/90 to-transparent opacity-0 transition group-hover/row:opacity-100 md:grid ${side === "left" ? "left-0" : "right-0"}`}
          >
            {side === "left" ? <ChevronLeft /> : <ChevronRight />}
          </button>
        ))}
        <div
          ref={ref}
          className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-7 pt-3 md:gap-4 md:scroll-px-14 md:px-14"
        >
          {items.map((t, i) => (
            <Card key={t.id} t={t} index={i} mine={mine} onOpen={onOpen} experimental={experimental} />
          ))}
        </div>
      </div>
    </section>
  );
}
