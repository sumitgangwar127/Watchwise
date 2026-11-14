import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, Play, X, XCircle } from "lucide-react";
import { timeAgo, timeUntil } from "../timeAgo.js";

const STATUS = {
  ok: { label: "OK", Icon: CheckCircle2, cls: "text-emerald-300" },
  warn: { label: "Needs attention", Icon: AlertTriangle, cls: "text-amber-300" },
  error: { label: "Failed, will retry", Icon: XCircle, cls: "text-red-300" },
  skipped: { label: "Skipped", Icon: CircleDashed, cls: "text-white/50" },
};

const every = (h) => (h >= 168 ? "weekly" : h >= 24 ? "daily" : `every ${h} h`);

/** Which scheduled jobs exist, when they last ran and run next, and a way to run or pause each one. */
export default function SchedulesPanel({ onClose }) {
  const [jobs, setJobs] = useState(null);
  const [events, setEvents] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      Promise.all([fetch("/api/jobs").then((r) => r.json()), fetch("/api/events").then((r) => r.json())])
        .then(([j, e]) => {
          setJobs(j.jobs);
          setEvents(e.count);
        })
        .catch(() => setError("Couldn't load the schedules.")),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // While a job is running (here or in the background), keep the list fresh
  const anyRunning = jobs?.some((j) => j.running) || busy;
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [anyRunning, load]);

  useEffect(() => {
    const on = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function run(id) {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't run it");
      if (data.jobs) setJobs(data.jobs);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      load();
    }
  }

  async function toggle(id, enabled) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.jobs) setJobs(data.jobs);
  }

  async function clearUsage() {
    await fetch("/api/events", { method: "DELETE" });
    load();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Schedules"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-edge bg-panel p-5 shadow-2xl md:max-w-2xl md:rounded-3xl md:p-7"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/5 transition hover:bg-white/15"
        >
          <X size={18} />
        </button>
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent/80">Automatic updates</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Schedules</h2>
        <p className="mt-2 max-w-lg text-sm text-white/55">
          These jobs keep your catalog fresh and your taste profile current. They run while Watchwise is open and catch up
          when you open it after a break.
        </p>

        {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</p>}

        {!jobs ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="animate-spin text-accent" />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {jobs.map((j) => {
              const st = STATUS[j.lastStatus];
              const running = j.running || busy === j.id;
              return (
                <li key={j.id} className="rounded-2xl border border-edge bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{j.name}</h3>
                        <span className="rounded-full border border-edge px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
                          {every(j.everyHours)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/50">{j.description}</p>
                    </div>
                    <label className="relative mt-1 inline-flex shrink-0 cursor-pointer items-center" title={j.enabled ? "On" : "Off"}>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={j.enabled}
                        onChange={(e) => toggle(j.id, e.target.checked)}
                        aria-label={`${j.name}: ${j.enabled ? "on" : "off"}`}
                      />
                      <span className="h-6 w-10 rounded-full bg-white/15 transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60" />
                      <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition peer-checked:translate-x-4 peer-checked:bg-ink" />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {running ? (
                      <span className="flex items-center gap-1.5 text-accent">
                        <Loader2 size={13} className="animate-spin" /> Running now…
                      </span>
                    ) : st ? (
                      <span className={`flex items-center gap-1.5 ${st.cls}`}>
                        <st.Icon size={13} /> {st.label} · {timeAgo(j.lastRunAt)}
                      </span>
                    ) : (
                      <span className="text-white/40">Hasn't run yet</span>
                    )}
                    <span className="text-white/40">{j.enabled ? `Next ${timeUntil(j.nextRunAt)}` : "Paused"}</span>
                    <button
                      onClick={() => run(j.id)}
                      disabled={Boolean(anyRunning)}
                      className="ml-auto flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-white/75 transition enabled:hover:border-white/30 enabled:hover:text-white disabled:opacity-40"
                    >
                      <Play size={12} className="fill-current" /> Run now
                    </button>
                  </div>
                  {j.lastMessage && !running && <p className="mt-2 text-xs leading-relaxed text-white/40">{j.lastMessage}</p>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-accent/30 bg-accent/[0.05] px-4 py-3 text-sm">
          <span className="text-white/70">
            Usage data on this computer: <span className="text-white">{events ?? "…"}</span> events (opens, trailer plays, "Watch on"
            clicks). Never sent anywhere.
          </span>
          <button
            onClick={clearUsage}
            disabled={!events}
            className="rounded-full border border-edge px-3 py-1.5 text-xs text-white/70 transition enabled:hover:border-white/30 enabled:hover:text-white disabled:opacity-40"
          >
            Clear usage data
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/35">
          Want them to run when the app is closed? Add <code className="text-white/55">npm run jobs -- run-due</code> from the
          project folder to your computer's scheduler (cron on Mac and Linux).
        </p>
      </motion.div>
    </motion.div>
  );
}
