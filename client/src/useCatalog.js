import { useCallback, useEffect, useState } from "react";
import { DEMO } from "./demo.js";

/** The live TMDB catalog when there is one, otherwise the bundled sample titles. */
export function useCatalog(enabled) {
  const [catalog, setCatalog] = useState(null); // { items, sample }
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const reload = useCallback(
    () =>
      fetch("/api/catalog")
        .then((r) => r.json())
        .then(({ items }) => setCatalog(items.length >= 8 ? { items, sample: false } : { items: DEMO, sample: true }))
        .catch(() => setCatalog({ items: DEMO, sample: true })),
    [],
  );

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setMessage("");
    try {
      const res = await fetch("/api/catalog/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      await reload();
      setMessage(`${data.added} new, ${data.updated} updated`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  return { catalog, reload, refresh, refreshing, message };
}
