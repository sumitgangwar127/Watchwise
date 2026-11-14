import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Backdrop from "./Backdrop.jsx";
import Bulbs from "./Bulbs.jsx";
import Logo from "./Logo.jsx";

const TITLE = "WATCHWISE".split("");
const curtainEase = [0.7, 0, 0.2, 1];

/** Film-leader countdown, then velvet curtains part on the title. Click or press a key to skip. */
function Leader({ n }) {
  return (
    <motion.div
      className="absolute inset-0 z-30 grid place-items-center bg-[#0b0b0c]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
      <div className="relative grid size-56 place-items-center sm:size-72">
        <div className="absolute inset-0 rounded-full border-2 border-white/35" />
        <div className="absolute inset-5 rounded-full border border-white/20" />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(from 0deg, rgba(255,255,255,0.28), transparent 25%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
        />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={n}
            className="font-display text-[120px] font-bold italic leading-none text-white/90 sm:text-[160px]"
            initial={{ opacity: 0, scale: 1.35 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
          >
            {n}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="absolute bottom-8 text-[10px] tracking-[0.35em] text-white/30">WATCHWISE · REEL 1</div>
    </motion.div>
  );
}

export default function Intro({ onDone }) {
  const [stage, setStage] = useState(3); // 3 → 2 → 1 → "curtain" → "open"

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(2), 500),
      setTimeout(() => setStage(1), 1000),
      setTimeout(() => setStage("curtain"), 1500),
      setTimeout(() => setStage("open"), 2200),
      setTimeout(onDone, 4600),
    ];
    const skip = (e) => ["Escape", " ", "Enter"].includes(e.key) && onDone();
    window.addEventListener("keydown", skip);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
    };
  }, [onDone]);

  const counting = typeof stage === "number";
  const open = stage === "open";

  return (
    <motion.div
      className="fixed inset-0 z-50 cursor-pointer overflow-hidden bg-ink"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.7 }}
    >
      {/* Behind the curtains: lobby wall, projector beam and the title */}
      <motion.div className="absolute inset-0" animate={{ opacity: open ? 1 : 0 }} transition={{ duration: 1.2 }}>
        <Backdrop className="opacity-[0.28]" />
        <div className="beam absolute left-1/2 top-0 h-[90vh] w-[120vw] -translate-x-1/2" />
      </motion.div>

      {open && (
        <div className="absolute inset-0 z-10 grid place-items-center px-4">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.5 }}
              className="mb-7 flex justify-center"
            >
              <Logo size={64} text={false} />
            </motion.div>

            <div className="mx-auto w-full max-w-[560px]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-4 px-1"
              >
                <Bulbs count={18} />
              </motion.div>
              <div className="flex justify-center text-[34px] font-black tracking-[0.2em] sm:text-6xl sm:tracking-[0.28em]">
                {TITLE.map((l, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.75 + i * 0.07 }}
                    className="bg-gradient-to-b from-white to-accent bg-clip-text text-transparent"
                  >
                    {l}
                  </motion.span>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-4 px-1"
              >
                <Bulbs count={18} />
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7, duration: 0.6 }}
              className="mt-7 text-[11px] uppercase tracking-[0.4em] text-accent/80 sm:text-xs"
            >
              Your taste. Every platform.
            </motion.p>
          </div>
        </div>
      )}

      {/* Curtains */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <motion.div
          className="velvet absolute inset-y-0 left-0 w-1/2 border-r-4 border-accent/30 shadow-[14px_0_50px_rgba(0,0,0,0.7)]"
          initial={{ x: "0%", opacity: 0 }}
          animate={{ x: open ? "-100%" : "0%", opacity: counting ? 0 : 1 }}
          transition={{ x: { duration: 1.3, ease: curtainEase }, opacity: { duration: 0.15 } }}
        />
        <motion.div
          className="velvet absolute inset-y-0 right-0 w-1/2 border-l-4 border-accent/30 shadow-[-14px_0_50px_rgba(0,0,0,0.7)]"
          initial={{ x: "0%", opacity: 0 }}
          animate={{ x: open ? "100%" : "0%", opacity: counting ? 0 : 1 }}
          transition={{ x: { duration: 1.3, ease: curtainEase }, opacity: { duration: 0.15 } }}
        />
        <motion.div
          className="absolute inset-0 grid place-items-center"
          animate={{ opacity: stage === "curtain" ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rounded-lg border border-accent/50 bg-black/55 px-6 py-4 text-center backdrop-blur-sm">
            <Bulbs count={10} className="mb-3 w-44" />
            <div className="text-xs font-bold tracking-[0.45em] text-accent">NOW SHOWING</div>
            <Bulbs count={10} className="mt-3 w-44" />
          </div>
        </motion.div>
      </div>

      <AnimatePresence>{counting && <Leader key="leader" n={stage} />}</AnimatePresence>

      <div className="absolute inset-x-0 bottom-6 z-40 text-center text-[11px] tracking-widest text-white/35">
        TAP TO SKIP
      </div>
    </motion.div>
  );
}
