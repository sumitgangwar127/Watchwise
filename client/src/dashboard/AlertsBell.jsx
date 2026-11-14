import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, HeartPulse, Sparkles, Tv } from "lucide-react";
import { timeAgo } from "../timeAgo.js";

const ICON = { arrived: Tv, left: Tv, digest: Sparkles, health: HeartPulse };

/** Notifications created by the scheduled jobs: new titles found, saved titles arriving or leaving, health warnings. */
export default function AlertsBell({ onOpenTitle }) {
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const load = useCallback(
    () =>
      fetch("/api/alerts")
        .then((r) => r.json())
        .then((d) => {
          setAlerts(d.alerts ?? []);
          setUnread(d.unread ?? 0);
        })
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  // Close when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!open) return;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Mark as read on the server, but keep the unread styling in this view until it closes
      fetch("/api/alerts/read", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
        .then(() => setUnread(0))
        .catch(() => {});
    }
    if (!next) load();
  };

  return (
    <div className="relative" ref={box}>
      <button
        onClick={toggle}
        aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/70 transition hover:bg-white/15 hover:text-white"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl"
          >
            <div className="border-b border-edge px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent/80">
              Alerts
            </div>
            {alerts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-white/45">
                Nothing yet. When a saved title reaches one of your apps, or new titles are found, you'll see it here.
              </p>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {alerts.map((a) => {
                  const Icon = ICON[a.kind] ?? Bell;
                  return (
                    <li key={a.id}>
                      <button
                        disabled={!a.ref}
                        onClick={() => {
                          setOpen(false);
                          onOpenTitle?.(a.ref);
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition enabled:hover:bg-white/5 ${
                          a.read ? "" : "bg-accent/[0.07]"
                        }`}
                      >
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/5 text-accent">
                          <Icon size={14} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-white/90">{a.message}</span>
                          <span className="mt-0.5 block text-xs text-white/40">{timeAgo(a.at)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
