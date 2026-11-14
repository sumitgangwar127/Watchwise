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

/**
 * "Intermission": after a while with no activity the house lights go down, and a calm
 * slideshow of backdrops fades slowly with the time. Any input brings you back.
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

  const slides = useMemo(
    () =>
      items
        .filter((t) => t.backdrop)
        .sort((a, b) => hash(a.id) - hash(b.id))
        .slice(0, 12),
    [items],
  );

  const [i, setI] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!idle) return;
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 20000);
    const show = slides.length > 1 ? setInterval(() => setI((n) => (n + 1) % slides.length), 14000) : null;
    return () => {
      clearInterval(clock);
      if (show) clearInterval(show);
    };
  }, [idle, slides.length]);

  const slide = slides[i % Math.max(slides.length, 1)];
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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
          <AnimatePresence>
            {slide && (
              <motion.img
                key={slide.id}
                src={slide.backdrop}
                alt=""
                className="absolute inset-0 size-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.32 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3 }}
              />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000_85%)]" />

          <div className="absolute left-6 top-6 opacity-70 md:left-10 md:top-8">
            <Logo size={30} />
          </div>

          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.5em] text-accent/90">Intermission</div>
              <div className="mt-4 text-6xl font-extralight tabular-nums tracking-tight text-white/90 sm:text-8xl">
                {time}
              </div>
              <div className="mt-4 text-sm text-white/45">We'll be right back.</div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 px-6 text-center">
            {slide && (
              <div className="text-xs text-white/45">
                Up next: <span className="text-white/70">{slide.title}</span>
                {slide.year ? ` (${slide.year})` : ""}
              </div>
            )}
            <div className="text-[11px] tracking-widest text-white/30">MOVE THE MOUSE OR PRESS ANY KEY TO RETURN</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
