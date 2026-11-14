import { motion } from "framer-motion";

/** Width of the dark frame around the picture, in px. Players inset their video by this much. */
export const BEZEL = 10;

/**
 * Sits over the video so it feels set into the screen rather than pasted on: a soft inner
 * shadow at the edges, a faint reflection on the glass, and a slight vignette.
 */
export function ScreenGlass() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[15] rounded-[10px] shadow-[inset_0_0_70px_rgba(0,0,0,0.55)]"
      style={{
        background:
          "linear-gradient(118deg, rgba(255,255,255,0.07) 0%, transparent 32%), radial-gradient(ellipse at 50% 50%, transparent 62%, rgba(0,0,0,0.38) 100%)",
      }}
    />
  );
}

/**
 * A floor-standing speaker: cabinet with a bevelled edge, tweeter, two woofers with surrounds,
 * a fabric grille and a bass port. `rim` is the room's light colour, catching the side facing the screen.
 */
function Speaker({ width = 64, height, rim, facing = "right" }) {
  const tw = Math.round(width * 0.34);
  const ww = Math.round(width * 0.7);
  const ring = "0 0 0 3px #0b090d, 0 0 0 4px rgba(255,255,255,0.08)";
  const rimShadow = facing === "right" ? `inset -10px 0 18px -14px ${rim}` : `inset 10px 0 18px -14px ${rim}`;
  return (
    <div className="relative" style={{ width, height }}>
      <div className="absolute -bottom-3 left-1/2 h-5 w-[150%] -translate-x-1/2 rounded-[50%] bg-black blur-md" />
      <div
        className="absolute inset-0 overflow-hidden rounded-[10px] border border-white/10"
        style={{
          background: "linear-gradient(90deg, #221d22 0%, #130f14 38%, #0a080b 100%)",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), ${rimShadow}`,
          transition: "box-shadow 1.2s linear",
        }}
      >
        <div className="flex flex-col items-center" style={{ paddingTop: height * 0.06, gap: height * 0.045 }}>
          <div
            style={{
              width: tw,
              height: tw,
              borderRadius: "50%",
              background: "radial-gradient(circle at 38% 32%, #5d5764 0 10%, #1a171d 11% 55%, #08060a 56%)",
              boxShadow: ring,
            }}
          />
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                width: ww,
                height: ww,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 40% 34%, #4d4853 0 7%, #1c181f 8% 24%, #0b090d 25% 58%, #25212a 59% 64%, #0a080c 65%)",
                boxShadow: ring,
              }}
            />
          ))}
        </div>
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: "30%", background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)" }}
        />
        <div className="absolute bottom-[9%] left-1/2 h-2 w-1/2 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" />
      </div>
      <div className="absolute -bottom-1.5 -inset-x-1.5 h-2 rounded-sm border border-white/10 bg-[#0c0a0d]" />
    </div>
  );
}

/** An armrest with a cupholder and a soft LED strip, as seen from your own seat. */
function Armrest({ side, c }) {
  const right = side === "right";
  return (
    <div
      className="pointer-events-none absolute bottom-0"
      style={{ [right ? "right" : "left"]: 0, width: 230, height: 120, transform: right ? "scaleX(-1)" : undefined }}
    >
      <div
        className="absolute inset-0 rounded-tr-[64px]"
        style={{
          background: "linear-gradient(180deg, #241b21 0%, #0d090d 70%)",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.12), 0 -10px 30px rgba(0,0,0,0.6)",
          transform: "skewY(-5deg) translateY(34px)",
          transformOrigin: "left bottom",
        }}
      />
      <div
        className="absolute left-[70px] top-[56px] size-10 rounded-full bg-black ring-2 ring-white/10"
        style={{ boxShadow: "inset 0 4px 8px rgba(0,0,0,0.95)", transform: "scaleY(0.55)" }}
      />
      <div
        className="absolute left-4 top-[42px] h-[3px] w-[150px] rounded-full opacity-80 blur-[1px]"
        style={{ backgroundColor: c, transition: "background-color 1.2s linear", transform: "skewY(-5deg)" }}
      />
    </div>
  );
}

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * The view from your seat in a small home theater, in one-point perspective: the front wall with
 * the screen in the middle, side walls and ceiling running back toward you, a stepped floor,
 * speakers on the front and side walls, the row of seats ahead, and your own armrests.
 * The light colours (`c1`, `c2`) drift slowly with the trailer; nothing else moves.
 *
 * variant "centered": the screen sits in the middle of the room.
 * variant "wide":     the screen spans the width, so the side walls shrink to slivers.
 *
 * Draws only the room. The screen, captions and controls are placed over it by the player.
 */
export default function TheaterRoom({
  vp,
  L,
  T,
  W,
  H,
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

  // The front wall: a rectangle a little larger than the screen. Everything else recedes from it.
  const fx0 = Math.max(6, L - Math.min(W * 0.05, 56));
  const fx1 = Math.min(vp.w - 6, L + W + Math.min(W * 0.05, 56));
  const fy0 = Math.max(6, T - Math.min(T * 0.7, H * 0.2));
  const fy1 = T + H + H * 0.09;
  const { w, h } = vp;

  // A point on a side wall: depth 0 is at your seat, 1 is the front wall; height 0 is the ceiling, 1 the floor.
  const wallPoint = (side, depth, height) => {
    const x = side === "L" ? lerp(0, fx0, depth) : lerp(w, fx1, depth);
    const top = lerp(0, fy0, depth);
    const bottom = lerp(h, fy1, depth);
    return [x, top + (bottom - top) * height];
  };
  const quad = (side, d0, d1, h0, h1) =>
    [wallPoint(side, d0, h0), wallPoint(side, d1, h0), wallPoint(side, d1, h1), wallPoint(side, d0, h1)]
      .map((p) => p.join(","))
      .join(" ");

  const towers = centered && !narrow && fx0 >= 96;
  const corners = !centered && !narrow && spaceBelow > 110;
  const seats = centered ? spaceBelow >= 50 : !narrow && spaceBelow > 110;
  const seatW = centered ? 96 : 56;
  const seatCount = Math.ceil(w / (seatW + 8)) + 1;
  const towerH = Math.round(Math.min(H * 0.5, 260));
  const lines = "rgba(255,255,255,0.055)";

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
        {/* ---- Room surfaces in perspective ---- */}
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="r-ceiling" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#020104" />
              <stop offset="1" stopColor="#0d0b12" />
            </linearGradient>
            <linearGradient id="r-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#100c15" />
              <stop offset="1" stopColor="#030206" />
            </linearGradient>
            <linearGradient id="r-wallL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#030205" />
              <stop offset="1" stopColor="#140f19" />
            </linearGradient>
            <linearGradient id="r-wallR" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="#030205" />
              <stop offset="1" stopColor="#140f19" />
            </linearGradient>
            <linearGradient id="r-front" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#15111b" />
              <stop offset="1" stopColor="#0b090e" />
            </linearGradient>
            <pattern id="r-slats" width="24" height="10" patternUnits="userSpaceOnUse">
              <rect width="2" height="10" fill="rgba(255,255,255,0.045)" />
            </pattern>
            <filter id="r-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          <polygon points={`0,0 ${w},0 ${fx1},${fy0} ${fx0},${fy0}`} fill="url(#r-ceiling)" />
          <polygon points={`0,${h} ${w},${h} ${fx1},${fy1} ${fx0},${fy1}`} fill="url(#r-floor)" />
          <polygon points={`0,0 ${fx0},${fy0} ${fx0},${fy1} 0,${h}`} fill="url(#r-wallL)" />
          <polygon points={`${w},0 ${fx1},${fy0} ${fx1},${fy1} ${w},${h}`} fill="url(#r-wallR)" />
          <rect x={fx0} y={fy0} width={fx1 - fx0} height={fy1 - fy0} fill="url(#r-front)" />
          <rect x={fx0} y={fy0} width={fx1 - fx0} height={fy1 - fy0} fill="url(#r-slats)" />

          {/* Side wall panel seams and chair rail */}
          {["L", "R"].map((side) => (
            <g key={side} stroke={lines} strokeWidth="1" fill="none">
              {[0.3, 0.52, 0.72, 0.86].map((t) => (
                <line
                  key={t}
                  x1={wallPoint(side, t, 0)[0]}
                  y1={wallPoint(side, t, 0)[1]}
                  x2={wallPoint(side, t, 1)[0]}
                  y2={wallPoint(side, t, 1)[1]}
                />
              ))}
              <polyline points={`${wallPoint(side, 0, 0.55)} ${wallPoint(side, 1, 0.55)}`} />
            </g>
          ))}

          {/* Ceiling seams, and a few downlights */}
          <g stroke={lines} strokeWidth="1">
            {[0.2, 0.4, 0.6, 0.8].map((u) => (
              <line key={u} x1={u * w} y1="0" x2={lerp(fx0, fx1, u)} y2={fy0} />
            ))}
            {[0.4, 0.7].map((t) => (
              <line key={t} x1={lerp(0, fx0, t)} y1={lerp(0, fy0, t)} x2={lerp(w, fx1, t)} y2={lerp(0, fy0, t)} />
            ))}
          </g>
          {[0.3, 0.55, 0.8].flatMap((t) =>
            [0.25, 0.75].map((u) => (
              <circle
                key={`${t}-${u}`}
                cx={lerp(lerp(0, fx0, t), lerp(w, fx1, t), u)}
                cy={lerp(0, fy0, t)}
                r={lerp(3.2, 1.6, t)}
                fill="#ffe9bf"
                opacity="0.75"
              />
            )),
          )}

          {/* Cove lighting where the ceiling meets the walls */}
          {[
            [0, 0, fx0, fy0],
            [w, 0, fx1, fy0],
          ].map(([x1, y1, x2, y2]) => (
            <g key={x1} style={{ stroke: c1, transition: "stroke 1.2s linear" }} strokeLinecap="round">
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="7" opacity="0.55" filter="url(#r-soft)" />
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.6" opacity="0.9" />
            </g>
          ))}
          <g style={{ stroke: c1, transition: "stroke 1.2s linear" }} strokeLinecap="round">
            <line x1={fx0} y1={fy0} x2={fx1} y2={fy0} strokeWidth="6" opacity="0.5" filter="url(#r-soft)" />
            <line x1={fx0} y1={fy0} x2={fx1} y2={fy0} strokeWidth="1.5" opacity="0.85" />
          </g>

          {/* Floor: carpet lines and two shallow steps */}
          <g stroke={lines} strokeWidth="1">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((u) => (
              <line key={u} x1={lerp(fx0, fx1, u)} y1={fy1} x2={u * w} y2={h} />
            ))}
          </g>
          {[0.38, 0.7].map((t) => (
            <line
              key={t}
              x1={lerp(fx0, 0, t)}
              y1={lerp(fy1, h, t)}
              x2={lerp(fx1, w, t)}
              y2={lerp(fy1, h, t)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
            />
          ))}
          <line x1={fx0} y1={fy1} x2={fx1} y2={fy1} stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" />

          {/* Surround speakers on the side walls */}
          {["L", "R"].map((side) => (
            <g key={side}>
              <polygon points={quad(side, 0.36, 0.5, 0.26, 0.44)} fill="#0c0a0f" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <polygon points={quad(side, 0.38, 0.48, 0.29, 0.41)} fill="#070509" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <polygon points={quad(side, 0.57, 0.66, 0.3, 0.42)} fill="#0c0a0f" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            </g>
          ))}
        </svg>

        {/* ---- Light from the screen washing over the room ---- */}
        <div
          className={`absolute rounded-[40px] opacity-80 blur-[80px] ${glow}`}
          style={{ left: L - 30, top: T - 24, width: W + 60, height: H + 48, backgroundColor: c1 }}
        />
        <div
          className={`absolute rounded-full opacity-35 blur-[90px] ${glow}`}
          style={{ left: L + W * 0.55, top: T + H * 0.25, width: W * 0.45, height: H * 0.7, backgroundColor: c2 }}
        />
        <div
          className={`absolute rounded-[50%] opacity-70 blur-[90px] ${glow}`}
          style={{ left: L + W * 0.06, top: T + H - 10, width: W * 0.88, height: 170, backgroundColor: c2 }}
        />
        <div
          className={`absolute left-0 w-[22%] rounded-full opacity-30 blur-[100px] ${glow}`}
          style={{ top: h * 0.25, height: h * 0.5, backgroundColor: c1 }}
        />
        <div
          className={`absolute right-0 w-[22%] rounded-full opacity-30 blur-[100px] ${glow}`}
          style={{ top: h * 0.25, height: h * 0.5, backgroundColor: c2 }}
        />

        {/* ---- Speakers: front tower pair (on the floor) ---- */}
        {towers && (
          <>
            <div className="absolute" style={{ left: Math.max(8, fx0 - 78), top: fy1 + 8 - towerH }}>
              <Speaker height={towerH} rim={c1} facing="right" />
            </div>
            <div className="absolute" style={{ left: fx1 + 14, top: fy1 + 8 - towerH }}>
              <Speaker height={towerH} rim={c1} facing="left" />
            </div>
          </>
        )}
        {corners && (
          <>
            <div className="absolute bottom-7 left-6 hidden lg:block">
              <Speaker width={54} height={Math.min(spaceBelow - 24, 190)} rim={c1} facing="right" />
            </div>
            <div className="absolute bottom-7 right-6 hidden lg:block">
              <Speaker width={54} height={Math.min(spaceBelow - 24, 190)} rim={c1} facing="left" />
            </div>
          </>
        )}

        {/* ---- The row of seats ahead of you ---- */}
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
                  opacity: centered ? 0.5 + (i % 2) * 0.1 : 0.4 + (i % 3) * 0.08,
                }}
              />
            ))}
          </div>
        )}

        {/* ---- Your own armrests, in the foreground ---- */}
        {centered && !narrow && h >= 640 && (
          <>
            <Armrest side="left" c={c1} />
            <Armrest side="right" c={c1} />
          </>
        )}
      </motion.div>
    </>
  );
}
