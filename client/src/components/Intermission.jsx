import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "./Logo.jsx";

/** True once there has been no mouse, key, touch or scroll activity for `ms`. */
function useIdle(ms, enabled) {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled || !ms) {
      setIdle(false);
      return;
    }
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Never dim while a trailer is playing or the page is fullscreen
        if (document.body.dataset.media || document.fullscreenElement) arm();
        else setIdle(true);
      }, ms);
    };
    const wake = () => {
      setIdle(false);
      arm();
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    arm();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [ms, enabled]);

  return idle;
}

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// How long each kind of slide stays up: enough time to read it, then a slow fade
const HOLD = { story: 15000, numbers: 12000, people: 12000, tagline: 9000, fact: 9000, moment: 8000 };

/** The text of one slide, centred on the screen. A "moment" has no text: the picture is the point. */
function SlideBody({ slide }) {
  const label = (
    <div className="text-[11px] font-semibold uppercase tracking-[0.5em] text-accent/90">{slide.label}</div>
  );
  if (slide.kind === "moment") return null;

  return (
    <div className="mx-auto max-w-3xl px-6 text-center">
      {label}
      {slide.kind === "numbers" ? (
        <div className="mt-8 flex flex-wrap items-start justify-center gap-x-14 gap-y-8">
          {slide.stats.map((s) => (
            <div key={s.small} className="max-w-[15rem]">
              <div className="text-5xl font-extralight tracking-tight text-white sm:text-6xl">{s.big}</div>
              <div className="mt-2 text-sm leading-snug text-white/55">{s.small}</div>
            </div>
          ))}
        </div>
      ) : slide.kind === "people" ? (
        <ul className="mt-8 space-y-3 text-xl font-light text-white/90 sm:text-2xl">
          {slide.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : slide.kind === "tagline" ? (
        <p className="mt-8 font-display text-4xl italic leading-tight text-white sm:text-6xl">{slide.text}</p>
      ) : slide.kind === "fact" ? (
        <p className="mt-8 text-2xl font-light leading-snug text-white/90 sm:text-4xl">{slide.text}</p>
      ) : (
        <p className="mt-8 text-xl font-light leading-relaxed text-white/90 sm:text-3xl">{slide.text}</p>
      )}
    </div>
  );
}

/**
 * "Intermission": the house lights go down and a calm sequence of stories, facts and moments from
 * your titles fades past, over stills from the films. All of it comes from verified TMDB data.
 * Opens after you've been idle for a while, or on demand. Any input brings you back.
 */
export default function Intermission({ items, minutes, enabled, forced = false, onDismiss }) {
  const idleNow = useIdle(minutes * 60000, enabled && minutes > 0);
  const idle = idleNow || forced; // opened by the timer, or on demand from the button

  // When opened on demand, any input closes it. A short grace period stops the opening click from closing it at once.
  useEffect(() => {
    if (!forced) return;
    let armed = false;
    const grace = setTimeout(() => {
      armed = true;
    }, 1200);
    const wake = () => armed && onDismiss?.();
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(grace);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [forced, onDismiss]);

  // Load the feed the first time the screen opens
  const [feed, setFeed] = useState(null);
  useEffect(() => {
    if (!idle || feed !== null) return;
    let off = false;
    fetch("/api/intermission")
      .then((r) => r.json())
      .then((d) => !off && setFeed(d.slides ?? []))
      .catch(() => !off && setFeed([]));
    return () => {
      off = true;
    };
  }, [idle, feed]);

  // Without a feed (no TMDB key yet), fall back to a quiet slideshow of backdrops
  const deck = useMemo(() => {
    if (feed === null) return []; // still loading: just the clock for a moment
    if (feed.length) return feed;
    return items
      .filter((t) => t.backdrop)
      .sort((a, b) => hash(a.id) - hash(b.id))
      .slice(0, 12)
      .map((t) => ({ key: t.id, kind: "moment", label: "A moment from", text: t.title, title: t.title, year: t.year, image: t.backdrop }));
  }, [feed, items]);

  const [i, setI] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const slide = deck.length ? deck[i % deck.length] : null;

  useEffect(() => {
    if (!idle) return;
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(clock);
  }, [idle]);

  useEffect(() => {
    if (!idle || deck.length < 2 || !slide) return;
    const t = setTimeout(() => setI((n) => (n + 1) % deck.length), HOLD[slide.kind] ?? 10000);
    return () => clearTimeout(t);
  }, [idle, deck.length, slide]);

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const moment = slide?.kind === "moment";

  return (
    <AnimatePresence>
      {idle && (
        <motion.div
          key="intermission"
          role="dialog"
          aria-label="Intermission. Move the mouse or press any key to return."
          className="fixed inset-0 z-[55] cursor-none overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
        >
          {/* A still from the film, brighter when the picture is the point */}
          <AnimatePresence>
            {slide?.image && (
              <motion.img
                key={`${slide.key}-img`}
                src={slide.image}
                alt=""
                className="absolute inset-0 size-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: moment ? 0.8 : 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3 }}
              />
            )}
          </AnimatePresence>
          <div
            className={`absolute inset-0 ${
              moment
                ? "bg-[linear-gradient(to_top,#000_0%,transparent_45%,rgba(0,0,0,0.35)_100%)]"
                : "bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.25)_0%,#000_95%)]"
            }`}
          />

          <div className="absolute left-6 top-6 opacity-70 md:left-10 md:top-8">
            <Logo size={30} />
          </div>
          <div className="absolute right-6 top-6 text-right md:right-10 md:top-8">
            <div className="text-[10px] font-semibold uppercase tracking-[0.4em] text-accent/80">Intermission</div>
            <div className="mt-1 text-2xl font-extralight tabular-nums text-white/80">{time}</div>
          </div>

          {/* The story, fact or moment */}
          <div className="absolute inset-0 grid place-items-center">
            <AnimatePresence mode="wait">
              {slide && !moment && (
                <motion.div
                  key={`${slide.key}-body`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                >
                  <SlideBody slide={slide} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Which title this is about */}
          <AnimatePresence mode="wait">
            {slide && (
              <motion.div
                key={`${slide.key}-caption`}
                className="absolute inset-x-0 bottom-14 px-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
              >
                {moment && (
                  <div className="text-[11px] font-semibold uppercase tracking-[0.5em] text-accent/90">{slide.label}</div>
                )}
                <div className={moment ? "mt-2 text-3xl font-light text-white sm:text-5xl" : "text-sm text-white/55"}>
                  {slide.title}
                  {slide.year ? <span className="text-white/45">{moment ? ` (${slide.year})` : ` · ${slide.year}`}</span> : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-5 text-center text-[11px] tracking-widest text-white/30">
            MOVE THE MOUSE OR PRESS ANY KEY TO RETURN
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
