import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { DEMO } from "./demo.js";
import { Glow } from "./ui.jsx";
import Poster from "./components/Poster.jsx";

// Scripted progress messages so the user can see the system working.
// Only the profile save and AI check are real work today. The catalog-related
// lines are placeholders until the `refresh` command exists.
const script = (provider, country) => [
  "Saving your taste profile",
  provider ? `Connecting to ${provider}` : "Preparing your local engine",
  "Reading your favorites",
  `Checking what's streaming in ${country}`,
  "Matching your platforms",
  "Lining up your first picks",
];

const STEP_MS = 1100;
const reel = DEMO.filter((_, i) => i % 7 === 0).slice(0, 6);

export default function Building({ country, provider, onDone }) {
  const messages = script(provider, country);
  const [shown, setShown] = useState(1);
  const [apiDone, setApiDone] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  // Real setup call. Guarded so React StrictMode doesn't run it twice in dev.
  const run = () => {
    setError("");
    fetch("/api/onboarding/build", { method: "POST" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Setup failed");
        setApiDone(true);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []);

  useEffect(() => {
    if (shown > messages.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, messages.length]);

  const finished = shown > messages.length;
  useEffect(() => {
    if (finished && apiDone) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
  }, [finished, apiDone, onDone]);

  const pct = Math.min(100, Math.round(((shown - 1) / messages.length) * 100));

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      <Glow />
      <div className="relative w-full max-w-md">
        {/* Film reel: posters orbit a glowing projector lamp */}
        <div className="relative mx-auto mb-10 grid size-60 place-items-center">
          <motion.div
            className="absolute size-28 rounded-full bg-accent/30 blur-2xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          >
            {reel.map((t, i) => (
              <div
                key={t.id}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `rotate(${i * 60}deg) translateY(-98px)` }}
              >
                <Poster t={t} showTitle={false} className="-ml-[22px] -mt-[33px] w-11 shadow-lg ring-1 ring-white/20" />
              </div>
            ))}
          </motion.div>
          <div className="relative grid size-20 place-items-center rounded-full border border-accent/50 bg-ink/80 text-lg font-semibold text-accent">
            {pct}%
          </div>
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {finished ? "Almost showtime" : "Dimming the lights"}
        </h1>

        <ul className="mt-8 space-y-3">
          {messages.slice(0, shown).map((m, i) => {
            const done = i < shown - 1 || finished;
            return (
              <motion.li
                key={m}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-sm sm:text-base"
              >
                {done ? (
                  <Check size={16} className="shrink-0 text-accent" />
                ) : (
                  <Loader2 size={16} className="shrink-0 animate-spin text-accent" />
                )}
                <span className={done ? "text-white/55" : "text-white"}>{m}…</span>
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-accent to-amber"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {error && (
          <div className="mt-6 text-center text-sm">
            <p className="text-red-400">{error}</p>
            <button onClick={run} className="mt-2 text-accent underline">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
