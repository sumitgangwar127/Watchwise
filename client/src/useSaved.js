import { useCallback, useRef, useState } from "react";

const KEY = "ww_list2";
const TMDB_ID = /^(movie|tv)-\d+$/;

/** Mirror a save or un-save to the server, so scheduled jobs can alert you when a saved title reaches your apps. */
function syncToServer(id, saved) {
  if (!TMDB_ID.test(id)) return; // sample titles aren't real
  const request = saved
    ? fetch("/api/history", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: "watchlist" }) })
    : fetch(`/api/history/${encodeURIComponent(id)}?only=watchlist`, { method: "DELETE" }); // never erases a "watched" entry
  request.catch(() => {});
}

/** "My List": titles saved for later. Stored in this browser as small snapshots. */
export function useSaved() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const toggle = useCallback((t) => {
    syncToServer(t.id, !itemsRef.current.some((x) => x.id === t.id));
    setItems((cur) => {
      const snap = {
        id: t.id,
        type: t.type,
        title: t.title,
        year: t.year ?? null,
        poster: t.poster ?? null,
        backdrop: t.backdrop ?? null,
        genres: t.genres ?? [],
        platforms: t.platforms ?? [],
        blurb: t.blurb ?? "",
        rating: t.rating ?? null,
        released: t.released ?? null,
      };
      const next = cur.some((x) => x.id === t.id) ? cur.filter((x) => x.id !== t.id) : [snap, ...cur];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return next;
    });
  }, []);

  const isSaved = useCallback((id) => items.some((x) => x.id === id), [items]);
  return { items, toggle, isSaved };
}
