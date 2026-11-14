import { motion } from "framer-motion";

/**
 * A small home-theater room drawn around a screen: acoustic wall, cove lighting, speakers,
 * seats and a floor. The light colours (`c1`, `c2`) drift slowly with the trailer; nothing else moves.
 *
 * variant "centered": the screen sits in the middle of the room, speaker towers on either side,
 *                     seat backs in the foreground as if you were sitting behind them.
 * variant "wide":     the screen spans the width; speakers sit in the bottom corners.
 *
 * Draws only the room. The screen, captions and controls are placed over it by the player.
 */
export default function TheaterRoom({
  vp,
  L,
  T,
  W,
  H,
  wallBottom,
  spaceBelow,
  narrow,
  c1,
  c2,
  reduce,
  variant = "centered",
  onBackdropClick,
}) {
  const glow = "transition-colors duration-[1200ms] ease-linear"; // colours drift, they never jump
  const centered = variant === "centered";
  const fade = { duration: reduce ? 0.01 : 0.6 };

  const towers = centered && !narrow && L >= 110;
  const corners = !centered && !narrow && spaceBelow > 110;
  const seats = centered ? spaceBelow >= 50 : !narrow && spaceBelow > 110;
  const seatW = centered ? 96 : 56;
  const seatCount = Math.ceil(vp.w / (seatW + 8)) + 1;

  return (
    <>
      <motion.div
        className="absolute inset-0 bg-[#050407]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fade}
        onClick={onBackdropClick}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.25 } }}
        transition={fade}
      >
        {/* Acoustic wall */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: wallBottom,
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 26px), linear-gradient(180deg, #0d0a10, #08060a)",
          }}
        />

        {/* Cove lighting along the ceiling and the side walls */}
        <div className={`absolute inset-x-[6%] -top-6 h-16 rounded-full opacity-60 blur-2xl ${glow}`} style={{ backgroundColor: c1 }} />
        <div className={`absolute inset-y-0 left-0 w-2 opacity-90 blur-[4px] ${glow}`} style={{ backgroundColor: c2 }} />
        <div className={`absolute inset-y-0 right-0 w-2 opacity-90 blur-[4px] ${glow}`} style={{ backgroundColor: c2 }} />

        {/* Light thrown by the screen onto the wall */}
        <div
          className={`absolute rounded-[40px] opacity-80 blur-[80px] ${glow}`}
          style={{ left: L - 30, top: T - 24, width: W + 60, height: H + 48, backgroundColor: c1 }}
        />
        <div
          className={`absolute rounded-full opacity-35 blur-[90px] ${glow}`}
          style={{ left: L + W * 0.55, top: T + H * 0.25, width: W * 0.45, height: H * 0.7, backgroundColor: c2 }}
        />

        {/* Floor, with the screen's light spilling onto it */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: wallBottom, background: "linear-gradient(180deg, #0a0810, #050407 70%)" }}
        />
        <div
          className={`absolute rounded-[50%] opacity-70 blur-[90px] ${glow}`}
          style={{ left: L + W * 0.08, top: T + H - 10, width: W * 0.84, height: 170, backgroundColor: c2 }}
        />

        {/* Speaker towers flanking the screen */}
        {towers &&
          [L - 92, L + W + 28].map((x) => (
            <div
              key={x}
              className="absolute w-16 rounded-2xl border border-white/10"
              style={{
                left: x,
                top: T + H * 0.04,
                height: H * 0.92,
                background:
                  "radial-gradient(circle at 50% 22%, #1d1920 0 11%, #0e0c10 12% 15%, transparent 16%), radial-gradient(circle at 50% 56%, #1d1920 0 20%, #0e0c10 21% 25%, transparent 26%), radial-gradient(circle at 50% 86%, #1d1920 0 15%, #0e0c10 16% 19%, transparent 20%), linear-gradient(180deg, #131016, #0a080c)",
              }}
            >
              <span className={`absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-full ${glow}`} style={{ backgroundColor: c1 }} />
            </div>
          ))}

        {/* Speakers in the bottom corners (wide layout) */}
        {corners &&
          ["left-4", "right-4"].map((side) => (
            <div
              key={side}
              className={`absolute bottom-6 ${side} hidden w-16 rounded-2xl border border-white/10 lg:block`}
              style={{
                height: Math.min(spaceBelow - 20, 190),
                background:
                  "radial-gradient(circle at 50% 28%, #1b171e 0 22%, transparent 23%), radial-gradient(circle at 50% 68%, #1b171e 0 30%, transparent 31%), linear-gradient(180deg, #121014, #0a080c)",
              }}
            >
              <span className={`absolute left-1/2 top-2 size-1 -translate-x-1/2 rounded-full ${glow}`} style={{ backgroundColor: c1 }} />
            </div>
          ))}

        {/* Seats. In the centered room they are big seat backs in the foreground */}
        {seats && (
          <div
            className={`absolute inset-x-0 flex justify-center overflow-hidden ${centered ? "-bottom-[56px] gap-2" : "bottom-0 gap-2 px-24"}`}
          >
            {Array.from({ length: seatCount }, (_, i) => (
              <div
                key={i}
                className="velvet shrink-0 rounded-t-[28px] shadow-[inset_0_8px_14px_rgba(255,255,255,0.12)]"
                style={{
                  width: seatW,
                  height: centered ? 118 : 48,
                  opacity: centered ? 0.55 + (i % 2) * 0.1 : 0.4 + (i % 3) * 0.08,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}
