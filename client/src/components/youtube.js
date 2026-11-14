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

  useEffect(() => {
    let cancelled = false;
    let player;
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

  const isPlaying = state === YT.PLAYING || state === YT.BUFFERING;
  const ended = state === YT.ENDED;
  const loading = !error && (!ready || state === YT.BUFFERING || (state === -1 && !started));

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
    }
  }, []);

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
