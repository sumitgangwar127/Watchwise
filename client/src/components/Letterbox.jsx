import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const introSeen = () => {
  try {
    return sessionStorage.getItem("ww_intro") === "1";
  } catch {
    return false;
  }
};

/**
 * Cinema letterbox bars. They cover the top and bottom of a banner, then slide away
 * once and stay gone. Waits for the curtain-up intro to finish on a fresh visit.
 * Place inside a `relative overflow-hidden` container.
 */
export default function Letterbox({ bars = 14, duration = 1.1 }) {
  const reduce = useReducedMotion();
  const [go, setGo] = useState(introSeen);

  useEffect(() => {
    if (go) return;
    const on = () => setGo(true);
    window.addEventListener("ww:intro-done", on);
    return () => window.removeEventListener("ww:intro-done", on);
  }, [go]);

  if (reduce) return null;
  return (
    <>
      {["top", "bottom"].map((side) => (
        <motion.div
          key={side}
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 z-20 bg-black ${side === "top" ? "top-0" : "bottom-0"}`}
          initial={{ height: `${bars}%` }}
          animate={{ height: go ? "0%" : `${bars}%` }}
          transition={{ duration, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
        />
      ))}
    </>
  );
}
