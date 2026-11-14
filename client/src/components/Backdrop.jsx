import { DEMO } from "../demo.js";
import Poster from "./Poster.jsx";

const COLS = 6;
const columns = Array.from({ length: COLS }, (_, i) => DEMO.filter((_, k) => k % COLS === i));
const visibility = ["", "", "", "hidden sm:flex", "hidden lg:flex", "hidden lg:flex"];

/** A slowly drifting wall of posters, like a cinema lobby. Purely decorative. */
export default function Backdrop({ className = "opacity-[0.16]", still = false }) {
  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-3 px-3 sm:grid-cols-4 lg:grid-cols-6">
        {columns.map((items, i) => (
          <div key={i} className={`${visibility[i]} flex-col overflow-visible`}>
            <div
              className={still ? "" : i % 2 ? "animate-drift-down" : "animate-drift-up"}
              style={still ? undefined : { animationDuration: `${70 + i * 11}s` }}
            >
              {[0, 1].map((half) => (
                <div key={half} className="flex flex-col gap-3 pb-3">
                  {items.map((t) => (
                    <Poster key={t.id} t={t} showTitle={false} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-ink)_78%)]" />
    </div>
  );
}
