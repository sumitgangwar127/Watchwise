const ID = /^(movie|tv)-\d+$/;

/**
 * Record a usage event (a title opened, a trailer played, a "Watch on" click). It goes to the local
 * database only and feeds the taste profile; nothing is sent anywhere else. Safe to call any time.
 */
export function track(kind, ref, platform = null) {
  if (!ID.test(String(ref))) return;
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, ref, platform }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the page */
  }
}
