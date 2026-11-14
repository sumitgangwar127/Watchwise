import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAmbientTimeline, useDominantColors } from "../colors.js";
import TheaterRoom, { BEZEL, ScreenGlass } from "./TheaterRoom.jsx";
import { ExternalLink, Loader2, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";

// The YouTube IFrame API is loaded only when a trailer is first played, so nothing
// contacts YouTube until the user asks for it.
let apiPromise = null;
function loadYouTubeApi() {
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

const clock = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const YouTubeMark = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#ff0033" />
    <path d="M10 8.7v6.6l5.6-3.3z" fill="#fff" />
  </svg>
);

const YT = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 };

/**
 * Cinema-style trailer player. The screen blooms out of the button that opened it, the lights
 * dim and the curtains draw in. Custom controls sit over a YouTube embed (YouTube's own are hidden).
 *
 * `from` is the on-screen rectangle of the button, `cta` is an optional "Watch on <platform>" action.
 */
export default function TrailerPlayer({ trailer, title, backdrop, stills = [], from, cta, onClose }) {
  const reduce = useReducedMotion();
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const hideTimer = useRef(0);

  const [ready, setReady] = useState(false);
  const [state, setState] = useState(-1);
  const [started, setStarted] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(100);
  const [scrub, setScrub] = useState(null);
  const [ui, setUi] = useState(true);
  const [full, setFull] = useState(false);
  const [error, setError] = useState("");

  // ---- geometry: a 16:9 screen centred in the viewport, leaving room for curtains and a caption ----
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const gutter = vp.w < 640 ? 14 : vp.w < 1024 ? 48 : 150;
  const W = Math.round(Math.max(280, Math.min(vp.w - gutter * 2, ((vp.h - 270) * 16) / 9, 980)));
  const H = Math.round(((W - BEZEL * 2) * 9) / 16) + BEZEL * 2; // the picture inside the frame stays 16:9
  const L = Math.round((vp.w - W) / 2);
  const T = Math.max(66, Math.round((vp.h - H) / 2 - 52));

  // ---- lock page scroll while open ----
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.media = "trailer"; // Intermission never starts while a trailer is open
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.media;
    };
  }, []);

  // ---- create the YouTube player ----
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
          videoId: trailer.key,
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
  }, [trailer.key, title]);

  // ---- track playback position ----
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

  // ---- fullscreen state ----
  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // ---- auto-hiding controls ----
  const poke = useCallback(() => {
    setUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setUi(false), 2800);
  }, []);
  useEffect(() => {
    poke();
    return () => clearTimeout(hideTimer.current);
  }, [poke]);

  const isPlaying = state === YT.PLAYING || state === YT.BUFFERING;
  const ended = state === YT.ENDED;
  const showUi = ui || !isPlaying || scrub !== null;
  const loading = !error && (!ready || state === YT.BUFFERING || (state === -1 && !started));

  // ---- actions ----
  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (state === YT.ENDED) {
      p.seekTo(0, true);
      p.playVideo();
    } else if (state === YT.PLAYING || state === YT.BUFFERING) p.pauseVideo();
    else p.playVideo();
    poke();
  }, [state, poke]);

  const commitSeek = () => {
    if (scrub == null) return;
    playerRef.current?.seekTo(scrub, true);
    setPos(scrub);
    setScrub(null);
  };
  const nudge = (s) => {
    const p = playerRef.current;
    if (!p) return;
    const next = Math.max(0, Math.min(dur, p.getCurrentTime() + s));
    p.seekTo(next, true);
    setPos(next);
    poke();
  };
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
    poke();
  }, [poke]);
  const changeVolume = (v) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(v);
    setVol(v);
    if (v > 0 && p.isMuted()) {
      p.unMute();
      setMuted(false);
    }
  };
  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else frameRef.current?.requestFullscreen?.();
  }, []);
  const pauseForExit = () => playerRef.current?.pauseVideo?.();

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (e.key === "Escape") {
        if (!document.fullscreenElement) onClose();
        return;
      }
      if ((e.key === " " || e.key === "Enter") && (tag === "BUTTON" || tag === "A" || tag === "INPUT")) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") nudge(5);
      else if (e.key === "ArrowLeft") nudge(-5);
      else if (e.key === "m") toggleMute();
      else if (e.key === "f") toggleFull();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- animation ----
  const spring = reduce ? { duration: 0.01 } : { type: "spring", stiffness: 170, damping: 24, mass: 0.9 };
  const fromBox = { top: from.top, left: from.left, width: from.width, height: from.height };
  const delay = reduce ? 0 : 0.45;
  const ytUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
  const pct = dur ? ((scrub ?? pos) / dur) * 100 : 0;

  // Room lighting follows the trailer: colours sampled from its frames (or movie stills), blended with the playhead
  const sets = useMemo(
    () => [
      [1, 2, 3].map((n, i) => ({ at: (i + 1) / 4, src: `https://i.ytimg.com/vi/${trailer.key}/${n}.jpg` })),
      stills.slice(0, 8).map((src, i, a) => ({ at: (i + 0.5) / a.length, src })),
    ],
    [trailer.key, stills],
  );
  const baseColors = useDominantColors(backdrop ?? null, ["#a8142d", "#4a0715"]);
  const [c1, c2] = useAmbientTimeline(sets, baseColors, dur ? (scrub ?? pos) / dur : 0);

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${title} trailer`}>
      {/* The room: wall, speakers, seats and light that follows the trailer */}
      <TheaterRoom
        vp={vp}
        L={L}
        T={T}
        W={W}
        H={H}
        spaceBelow={vp.h - (T + H + 14 + 64)}
        narrow={vp.w < 720}
        c1={c1}
        c2={c2}
        reduce={reduce}
        variant="centered"
        onBackdropClick={onClose}
      />

      {/* Caption */}
      <motion.div
        className="absolute"
        style={{ left: L, width: W, top: T + H + 14 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ delay: delay + 0.1, duration: 0.45 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Now playing</div>
            <div className="mt-1 truncate text-lg font-semibold">{title}</div>
          </div>
          {cta && (
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={pauseForExit}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              style={{ background: cta.color }}
            >
              <ExternalLink size={15} /> {cta.label}
            </a>
          )}
        </div>
      </motion.div>

      {/* The screen: grows out of the button that opened it */}
      <motion.div
        ref={frameRef}
        className="absolute overflow-hidden"
        style={{ position: "absolute" }}
        initial={{ ...fromBox, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", boxShadow: "0 0 0 rgba(0,0,0,0)" }}
        animate={{
          top: T,
          left: L,
          width: W,
          height: H,
          borderRadius: 18,
          backgroundColor: "#07060a",
          boxShadow: "0 30px 90px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        exit={{ ...fromBox, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", opacity: 0, transition: { duration: reduce ? 0.01 : 0.45, ease: [0.7, 0, 0.3, 1] } }}
        transition={spring}
      >
        <motion.div
          className={`absolute overflow-hidden rounded-[10px] bg-black ${!showUi && isPlaying ? "cursor-none" : ""}`}
          style={{ inset: BEZEL }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ delay, duration: 0.4 }}
          onPointerMove={poke}
          onPointerDown={poke}
        >
          {/* Backdrop shows until the video actually starts, so there's no black flash */}
          {backdrop && (
            <img
              src={backdrop}
              alt=""
              className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${started ? "opacity-0" : "opacity-60"}`}
            />
          )}
          <div ref={hostRef} className="absolute inset-0" />
          <ScreenGlass />

          {/* Click anywhere on the picture to play or pause; double-click for fullscreen */}
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={toggle}
            onDoubleClick={toggleFull}
            className="absolute inset-0 z-10 cursor-pointer"
          />

          {/* Buffering */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="spin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
              >
                <Loader2 size={44} className="animate-spin text-accent drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Paused (including autoplay blocked by the browser) */}
          <AnimatePresence>
            {ready && !isPlaying && !ended && !error && !loading && (
              <motion.div
                key="paused"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
              >
                <span className="grid size-20 place-items-center rounded-full bg-black/55 ring-1 ring-white/30 backdrop-blur">
                  <Play size={34} className="ml-1 fill-white" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div
            className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 ${
              showUi ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="pointer-events-auto flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent p-3 sm:p-4">
              <div className="min-w-0 pt-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Trailer</div>
                <div className="truncate text-sm text-white/80">{trailer.name || title}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={pauseForExit}
                  className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-medium backdrop-blur transition hover:bg-black/80"
                >
                  <YouTubeMark /> <span className="hidden sm:inline">Watch on YouTube</span>
                  <span className="sm:hidden">YouTube</span>
                </a>
                <button
                  onClick={onClose}
                  aria-label="Close trailer"
                  className="grid size-9 place-items-center rounded-full bg-black/55 backdrop-blur transition hover:bg-black/80"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
              <input
                type="range"
                aria-label="Seek"
                className="scrubber block w-full"
                min={0}
                max={dur || 1}
                step={0.1}
                value={scrub ?? pos}
                style={{ "--p": `${pct}%` }}
                onChange={(e) => setScrub(Number(e.target.value))}
                onPointerUp={commitSeek}
                onPointerCancel={commitSeek}
                onKeyUp={commitSeek}
                onBlur={commitSeek}
              />
              <div className="mt-2.5 flex items-center gap-1 sm:gap-2">
                <button
                  onClick={toggle}
                  aria-label={isPlaying ? "Pause" : ended ? "Replay" : "Play"}
                  className="grid size-10 place-items-center rounded-full transition hover:bg-white/15"
                >
                  {ended ? <RotateCcw size={20} /> : isPlaying ? <Pause size={22} className="fill-white" /> : <Play size={22} className="fill-white" />}
                </button>
                <span className="px-1 text-xs tabular-nums text-white/75">
                  {clock(scrub ?? pos)} / {clock(dur)}
                </span>
                <span className="flex-1" />
                <button
                  onClick={toggleMute}
                  aria-label={muted || vol === 0 ? "Unmute" : "Mute"}
                  className="grid size-10 place-items-center rounded-full transition hover:bg-white/15"
                >
                  {muted || vol === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  aria-label="Volume"
                  className="scrubber hidden w-20 sm:block"
                  min={0}
                  max={100}
                  value={muted ? 0 : vol}
                  style={{ "--p": `${muted ? 0 : vol}%` }}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                />
                {document.fullscreenEnabled && (
                  <button
                    onClick={toggleFull}
                    aria-label={full ? "Exit fullscreen" : "Fullscreen"}
                    className="grid size-10 place-items-center rounded-full transition hover:bg-white/15"
                  >
                    {full ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* End screen */}
          <AnimatePresence>
            {ended && (
              <motion.div
                key="end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 grid place-items-center bg-black/80 px-4 backdrop-blur-sm"
              >
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">That's a wrap</div>
                  <div className="mt-2 text-xl font-semibold sm:text-2xl">{title}</div>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={toggle}
                      className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/20"
                    >
                      <RotateCcw size={16} /> Replay
                    </button>
                    {cta && (
                      <a
                        href={cta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                        style={{ background: cta.color }}
                      >
                        <ExternalLink size={15} /> {cta.label}
                      </a>
                    )}
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/20"
                    >
                      <YouTubeMark /> Watch on YouTube
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/85 px-6 text-center">
              <div>
                <p className="text-white/85">{error}</p>
                <a
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/20"
                >
                  <YouTubeMark /> Watch on YouTube
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>,
    document.body,
  );
}
