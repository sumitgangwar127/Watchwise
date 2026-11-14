import { useEffect, useState } from "react";

// A tiny History-API router: real URLs (/title/movie-27205), working back button,
// and remembered scroll positions. No dependency needed for two routes.
const subs = new Set();
const scrollMemo = new Map();
const here = () => location.pathname + location.search;
const idx = () => history.state?.idx ?? 0;

export function navigate(to, { replace = false } = {}) {
  if (to === here()) return;
  scrollMemo.set(here(), window.scrollY);
  history[replace ? "replaceState" : "pushState"]({ idx: replace ? idx() : idx() + 1 }, "", to);
  subs.forEach((f) => f());
  setTimeout(() => window.scrollTo(0, 0), 0);
}

/** Go back if the user navigated here from inside the app, otherwise go home. */
export function back() {
  if (idx() > 0) history.back();
  else navigate("/", { replace: true });
}

export function usePath() {
  const [path, setPath] = useState(() => location.pathname);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    const onPop = () => {
      update();
      // Restore where the user was after the previous page has re-rendered
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollMemo.get(here()) ?? 0)));
    };
    subs.add(update);
    window.addEventListener("popstate", onPop);
    return () => {
      subs.delete(update);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return path;
}

export const titlePath = (id) => `/title/${encodeURIComponent(id)}`;
