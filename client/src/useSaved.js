import { useCallback, useState } from "react";

const KEY = "ww_list2";

/** "My List": titles saved for later. Stored in this browser as small snapshots. */
export function useSaved() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const toggle = useCallback((t) => {
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
