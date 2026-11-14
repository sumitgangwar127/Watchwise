import { motion } from "framer-motion";

/**
 * Bias lighting: like the glow behind a TV, the colors of the current poster
 * spill softly onto the page edges. Colors fade slowly when the title changes,
 * and nothing moves otherwise.
 */
export default function Ambient({ colors, strength = 1 }) {
  const [a, b] = colors;
  const fade = { duration: 1.6, ease: "easeInOut" };
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <motion.div
        initial={false}
        className="absolute -left-[22vw] top-[6vh] h-[85vh] w-[46vw] rounded-full blur-[140px]"
        animate={{ backgroundColor: a, opacity: 0.32 * strength }}
        transition={fade}
      />
      <motion.div
        initial={false}
        className="absolute -right-[22vw] top-[18vh] h-[85vh] w-[46vw] rounded-full blur-[140px]"
        animate={{ backgroundColor: b, opacity: 0.28 * strength }}
        transition={fade}
      />
      <motion.div
        initial={false}
        className="absolute inset-x-[10vw] -bottom-[35vh] h-[60vh] blur-[150px]"
        animate={{ backgroundColor: a, opacity: 0.12 * strength }}
        transition={fade}
      />
    </div>
  );
}
