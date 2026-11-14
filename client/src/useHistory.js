import { useCallback, useEffect, useState } from "react";

/**
 * Watch history, stored in the local database. Marking something watched hides it from
 * suggestions, teaches the recommendations, and asks the server for similar new titles.
 */
export function useHistory(enabled, { onLearned } = {}) {
  const [items, setItems] = useState([]);

  const reload = useCallback(
    () =>
      fetch("/api/history")
        .then((r) => r.json())
        .then((d) => setItems(d.items ?? []))
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const get = useCallback((id) => items.find((x) => x.id === id), [items]);

  const mark = useCallback(
    async (t, status = "watched", rating = null) => {
      const prev = items.find((x) => x.id === t.id);
      const snap = {
        id: t.id,
        type: t.type,
        status,
        rating: rating ?? prev?.rating ?? null,
        at: new Date().toISOString(),
        title: t.title,
        year: t.year ?? null,
        poster: t.poster ?? null,
        backdrop: t.backdrop ?? null,
        genres: t.genres ?? [],
      };
      setItems((cur) => [snap, ...cur.filter((x) => x.id !== t.id)]); // update the screen immediately

      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: t.id, status, rating }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await reload(); // roll back to what the server really has
        throw new Error(data.error ?? "Could not save");
      }
      await reload();
      if (data.added > 0) onLearned?.(data);
      return data;
    },
    [items, reload, onLearned],
  );

  const unmark = useCallback(
    async (id) => {
      setItems((cur) => cur.filter((x) => x.id !== id));
      const res = await fetch(`/api/history/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        await reload();
        throw new Error("Could not remove");
      }
    },
    [reload],
  );

  return { items, get, mark, unmark, reload };
}
