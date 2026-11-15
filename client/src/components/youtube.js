import { useCallback, useEffect, useRef, useState } from "react";

// The YouTube IFrame API is loaded only when a trailer is first played, so nothing
// contacts YouTube until the user asks for it.
let apiPromise = null;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        apiPromise = null;
        reject(new Error("Couldn't load the YouTube player. Check your connection."));
      };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export const clock = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export const YT = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 };

// Phones block sound-on autoplay once the tap that opened the trailer is gone (the YouTube
// script loads after the tap), so on touch screens we start muted and offer "Tap for sound".
export const isTouch = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

/**
 * Hides the mouse pointer once the viewer has been still for `ms` while the trailer plays, and
 * brings it back on any movement. Done with a class on <body> so it also works in fullscreen
 * and over the buttons that would otherwise force a hand cursor.
 */
export function useIdleCursor(playing, ms = 1300) {
  useEffect(() => {
    const cls = "ww-idle";
    let t = 0;
    const show = () => {
      document.body.classList.remove(cls);
      clearTimeout(t);
      if (playing) t = setTimeout(() => document.body.classList.add(cls), ms);
    };
    show();
    const evs = ["pointermove", "pointerdown", "wheel", "keydown"];
    evs.forEach((e) => window.addEventListener(e, show, { passive: true }));
    return () => {
      evs.forEach((e) => window.removeEventListener(e, show));
      clearTimeout(t);
      document.body.classList.remove(cls);
    };
  }, [playing, ms]);
}

// ---- captions: off by default, remembered once the viewer turns them on ----
export const ccPref = () => {
  try {
    return localStorage.getItem("ww-cc") === "1";
  } catch {
    return false;
  }
};
export const saveCcPref = (on) => {
  try {
    localStorage.setItem("ww-cc", on ? "1" : "0");
  } catch {
    /* preference just isn't remembered */
  }
};

/** Show or hide YouTube's captions. Uses the player's caption module, so failures are swallowed. */
export function setCaptions(p, on) {
  try {
    if (!on) return p.unloadModule("captions");
    p.loadModule("captions");
    const tl = p.getOption("captions", "tracklist") || [];
    const lang = (navigator.language || "en").toLowerCase();
    const pick =
      tl.find((t) => t.languageCode.toLowerCase() === lang) ||
      tl.find((t) => t.languageCode.toLowerCase().startsWith(lang.split("-")[0])) ||
      tl.find((t) => t.languageCode.toLowerCase().startsWith("en"));
    if (pick) p.setOption("captions", "track", { languageCode: pick.languageCode });
  } catch {
    /* captions unavailable for this video */
  }
}

/** Does this trailer have any caption track (uploaded or auto-generated)? Resolves false if unsure. */
export function detectCaptions(p) {
  return new Promise((resolve) => {
    try {
      p.loadModule("captions");
    } catch {
      return resolve(false);
    }
    setTimeout(() => {
      let ok = false;
      try {
        const tl = p.getOption("captions", "tracklist") || [];
        const cur = p.getOption("captions", "track") || {};
        ok = tl.length > 0 || Boolean(cur.languageCode);
      } catch {
        ok = false;
      }
      resolve(ok);
    }, 800);
  });
}

// ---- fullscreen that also works on iPhone ----
// iPhone Safari has no fullscreen for ordinary elements, so there we fall back to filling the
// whole screen with the player ("pseudo" fullscreen). Everywhere else the real thing is used.
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const canNativeFs = (el) => Boolean(el && (el.requestFullscreen || el.webkitRequestFullscreen));

export function useFullscreen(elRef) {
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const pseudoRef = useRef(false);
  pseudoRef.current = pseudo;

  useEffect(() => {
    const on = () => {
      const f = Boolean(fsElement());
      setNative(f);
      if (!f) {
        try {
          screen.orientation?.unlock?.();
        } catch {
          /* not locked */
        }
      }
    };
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, []);

  const toggle = useCallback(() => {
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    if (pseudoRef.current) {
      setPseudo(false);
      return;
    }
    const el = elRef.current;
    if (canNativeFs(el)) {
      const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      Promise.resolve(r)
        .then(() => screen.orientation?.lock?.("landscape").catch(() => {}))
        .catch(() => setPseudo(true));
    } else setPseudo(true);
  }, [elRef]);

  // true while either kind of fullscreen is on; used so Escape leaves fullscreen before closing
  const isFull = useCallback(() => Boolean(fsElement()) || pseudoRef.current, []);
  const exit = useCallback(() => {
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    setPseudo(false);
  }, []);

  return { full: native || pseudo, pseudo, toggle, isFull, exit };
}

/**
 * A YouTube embed driven entirely by our own controls. Attach `hostRef` to an empty,
 * sized element; the iframe fills it and ignores the pointer (so our overlays get the clicks).
 */
export function useYouTubePlayer({ videoKey, title }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [state, setState] = useState(-1);
  const [started, setStarted] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(100);
  const [error, setError] = useState("");
  const [autoMuted, setAutoMuted] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [ccAvail, setCcAvail] = useState(false);
  const [ccOn, setCcOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let player;
    const touch = isTouch();
    loadYouTubeApi()
      .then((YTApi) => {
        if (cancelled || !hostRef.current) return;
        const mount = document.createElement("div");
        hostRef.current.appendChild(mount);
        player = new YTApi.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          videoId: videoKey,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: touch ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              playerRef.current = e.target;
              const f = e.target.getIframe();
              f.className = "absolute inset-0 size-full pointer-events-none";
              f.setAttribute("title", `${title} trailer`);
              setReady(true);
              setDur(e.target.getDuration());
              if (touch) {
                e.target.mute();
                setAutoMuted(true);
              }
              setMuted(e.target.isMuted());
              setVol(e.target.getVolume());
              e.target.playVideo();
            },
            onStateChange: (e) => {
              setState(e.data);
              if (e.data === YT.PLAYING) {
                setStarted(true);
                setDur(e.target.getDuration());
              }
            },
            onError: () => setError("This trailer can't be played here."),
          },
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* player already gone */
      }
      playerRef.current = null;
    };
  }, [videoKey, title]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      setPos(p.getCurrentTime());
      const d = p.getDuration();
      if (d) setDur(d);
    }, 250);
    return () => clearInterval(id);
  }, [ready]);

  // If the browser refuses to autoplay, stop showing a spinner and show the play button instead
  useEffect(() => {
    if (!ready || started) return;
    const id = setTimeout(() => setStalled(true), 2500);
    return () => clearTimeout(id);
  }, [ready, started]);
  useEffect(() => {
    if (state === YT.PLAYING) setStalled(false);
  }, [state]);

  const isPlaying = state === YT.PLAYING || state === YT.BUFFERING;
  const ended = state === YT.ENDED;
  const loading = !error && (!ready || state === YT.BUFFERING || (state === -1 && !started && !stalled));

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (state === YT.ENDED) {
      p.seekTo(0, true);
      p.playVideo();
    } else if (state === YT.PLAYING || state === YT.BUFFERING) p.pauseVideo();
    else p.playVideo();
  }, [state]);

  const seek = useCallback((s) => {
    playerRef.current?.seekTo(s, true);
    setPos(s);
  }, []);

  const nudge = useCallback(
    (delta) => {
      const p = playerRef.current;
      if (!p) return;
      seek(Math.max(0, Math.min(dur, p.getCurrentTime() + delta)));
    },
    [dur, seek],
  );

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    setAutoMuted(false);
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  }, []);

  const setVolume = useCallback((v) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    setVol(v);
    if (v > 0 && p.isMuted()) {
      p.unMute();
      setMuted(false);
      setAutoMuted(false);
    }
  }, []);

  // Once playing, find out whether captions exist; they stay off unless the viewer turned them on before
  useEffect(() => {
    if (!started) return;
    const p = playerRef.current;
    let live = true;
    detectCaptions(p).then((ok) => {
      if (!live) return;
      setCcAvail(ok);
      const on = ok && ccPref();
      setCaptions(p, on);
      setCcOn(on);
    });
    return () => {
      live = false;
    };
  }, [started]);

  const toggleCc = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const next = !ccOn;
    setCaptions(p, next);
    setCcOn(next);
    saveCcPref(next);
  }, [ccOn]);

  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);

  return {
    hostRef,
    ready,
    state,
    started,
    pos,
    dur,
    muted,
    vol,
    error,
    autoMuted,
    ccAvail,
    ccOn,
    toggleCc,
    isPlaying,
    ended,
    loading,
    toggle,
    seek,
    nudge,
    toggleMute,
    setVolume,
    pause,
  };
}
