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
 * "Lights come up": the banner starts dark and the picture fades in with a very slight settle,
 * once per page load. Nothing slides across the screen, so there are no moving edges.
 * On a fresh visit it waits for the curtain-up intro to finish.
 *
 * Wrap the banner's picture in <LightsUp>; the dark veil sits over it inside the same box.
 * Place inside a `relative overflow-hidden` container.
 */
export default function LightsUp({ children, duration = 1.3 }) {
  const reduce = useReducedMotion();
  const [go, setGo] = useState(introSeen);

  useEffect(() => {
    if (go) return;
    const on = () => setGo(true);
    window.addEventListener("ww:intro-done", on);
    return () => window.removeEventListener("ww:intro-done", on);
  }, [go]);

  if (reduce) return <div className="absolute inset-0">{children}</div>;
  return (
    <>
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.03 }}
        animate={{ scale: go ? 1 : 1.03 }}
        transition={{ duration: duration + 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-ink"
        initial={{ opacity: 1 }}
        animate={{ opacity: go ? 0 : 1 }}
        transition={{ duration, delay: 0.15, ease: "easeOut" }}
      />
    </>
  );
}
