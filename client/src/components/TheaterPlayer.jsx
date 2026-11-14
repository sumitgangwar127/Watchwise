import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "../track.js";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ExternalLink,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAmbientTimeline, useDominantColors } from "../colors.js";
import TheaterRoom, { BEZEL, ScreenGlass } from "./TheaterRoom.jsx";
import { clock, useYouTubePlayer } from "./youtube.js";

const YouTubeMark = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#ff0033" />
    <path d="M10 8.7v6.6l5.6-3.3z" fill="#fff" />
  </svg>
);

/**
 * "Theater" trailer player (experimental). A wide cinema screen runs edge to edge across the top,
 * and the rest of the view is a small home-theater room: acoustic wall, speakers, seats and
 * a control console. The room is lit by ambient colors that follow the trailer as it plays.
 *
 * The ambience is sampled from the trailer's own frames (YouTube thumbnails at ~25/50/75%) or
 * from movie stills, and blended as the playhead moves. It is not per-pixel live, because the
 * player's pixels can't be read from the page.
 */
export default function TheaterPlayer({ trailer, title, titleId, backdrop, stills = [], from, cta, onClose }) {
  const reduce = useReducedMotion();
  const roomRef = useRef(null);
  const yt = useYouTubePlayer({ videoKey: trailer.key, title });
  const { hostRef, started, pos, dur, muted, vol, error, isPlaying, ended, loading, ready } = yt;

  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [fit, setFit] = useState(false); // false = fill the wide screen, true = show the whole 16:9 picture
  const [full, setFull] = useState(false);
  const [scrub, setScrub] = useState(null);

  // ---- geometry: a wide screen across the top, room below ----
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const narrow = vp.w < 720;
  const g = vp.w < 640 ? 12 : 28;
  const W = vp.w - g * 2;
  const H = narrow
    ? Math.round(((W - BEZEL * 2) * 9) / 16) + BEZEL * 2
    : Math.max(200, Math.round(Math.min(W / 2.39, vp.h * 0.62)));
  const T = narrow ? 64 : 60;
  const L = g;
  const innerW = W - BEZEL * 2;
  const innerH = H - BEZEL * 2;
  const videoW = fit || narrow ? Math.min(innerW, Math.round((innerH * 16) / 9)) : Math.max(innerW, Math.round((innerH * 16) / 9));
  const videoH = Math.round((videoW * 9) / 16);
  const consoleTop = T + H + 14;
  const roomLeft = vp.h - (consoleTop + 132); // vertical space left for the seats

  // ---- page scroll lock, and tell the idle detector media is playing ----
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.media = "trailer";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.media;
    };
  }, []);

  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else roomRef.current?.requestFullscreen?.();
  };

  // ---- ambient light that follows the trailer ----
  const sets = useMemo(
    () => [
      [1, 2, 3].map((n, i) => ({ at: (i + 1) / 4, src: `https://i.ytimg.com/vi/${trailer.key}/${n}.jpg` })),
      stills.slice(0, 8).map((src, i, a) => ({ at: (i + 0.5) / a.length, src })),
    ],
    [trailer.key, stills],
  );
  const base = useDominantColors(backdrop ?? null, ["#a8142d", "#4a0715"]);
  const [c1, c2] = useAmbientTimeline(sets, base, dur ? (scrub ?? pos) / dur : 0);

  // ---- keyboard ----
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
        yt.toggle();
      } else if (e.key === "ArrowRight") yt.nudge(5);
      else if (e.key === "ArrowLeft") yt.nudge(-5);
      else if (e.key === "m") yt.toggleMute();
      else if (e.key === "f") toggleFull();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const commitSeek = () => {
    if (scrub == null) return;
    yt.seek(scrub);
    setScrub(null);
  };

  // Usage signals for the taste profile (stored locally): a play, and watching it to the end
  useEffect(() => {
    if (started && titleId) track("trailer_play", titleId);
  }, [started, titleId]);
  useEffect(() => {
    if (ended && titleId) track("trailer_complete", titleId);
  }, [ended, titleId]);

  const spring = reduce ? { duration: 0.01 } : { type: "spring", stiffness: 170, damping: 24, mass: 0.9 };
  const fromBox = { top: from.top, left: from.left, width: from.width, height: from.height };
  const delay = reduce ? 0 : 0.4;
  const ytUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
  const pct = dur ? ((scrub ?? pos) / dur) * 100 : 0;

  const iconBtn = "grid size-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20";

  return createPortal(
    <div
      ref={roomRef}
      className="fixed inset-0 z-[60] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer, theater view`}
    >
      {/* ---------- The room ---------- */}
      <TheaterRoom
        vp={vp}
        L={L}
        T={T}
        W={W}
        H={H}
        spaceBelow={roomLeft}
        narrow={narrow}
        c1={c1}
        c2={c2}
        reduce={reduce}
        variant="wide"
      />

      {/* ---------- Top bar ---------- */}
      <motion.div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 md:px-7"
        style={{ height: T }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ delay: reduce ? 0 : 0.2, duration: 0.4 }}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Now playing</div>
          <div className="truncate text-sm text-white/85">
            {title} <span className="text-white/40">· {trailer.name || "Trailer"}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </motion.div>

      {/* ---------- The screen: grows out of the banner, spans left to right ---------- */}
      <motion.div
        className="absolute z-10 overflow-hidden"
        initial={{ ...fromBox, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)" }}
        animate={{
          top: T,
          left: L,
          width: W,
          height: H,
          borderRadius: 18,
          backgroundColor: "#07060a",
          boxShadow: "0 30px 90px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        exit={{ ...fromBox, opacity: 0, transition: { duration: reduce ? 0.01 : 0.4, ease: [0.7, 0, 0.3, 1] } }}
        transition={spring}
      >
        <motion.div
          className="absolute overflow-hidden rounded-[10px] bg-black"
          style={{ inset: BEZEL }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ delay, duration: 0.4 }}
        >
          {backdrop && (
            <img
              src={backdrop}
              alt=""
              className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${started ? "opacity-0" : "opacity-60"}`}
            />
          )}
          {/* The video, centred and scaled to fill (or fit) the wide screen */}
          <div
            ref={hostRef}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: videoW, height: videoH }}
          />
          <ScreenGlass />
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={yt.toggle}
            onDoubleClick={toggleFull}
            className="absolute inset-0 z-10 cursor-pointer"
          />

          <AnimatePresence>
            {loading && (
              <motion.div
                key="spin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
              >
                <Loader2 size={42} className="animate-spin text-accent drop-shadow-lg" />
              </motion.div>
            )}
            {ready && !isPlaying && !ended && !error && !loading && (
              <motion.div
                key="paused"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
              >
                <span className="grid size-20 place-items-center rounded-full bg-black/55 ring-1 ring-white/30 backdrop-blur">
                  <Play size={34} className="ml-1 fill-white" />
                </span>
              </motion.div>
            )}
            {ended && (
              <motion.div
                key="end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 grid place-items-center bg-black/75 px-4 backdrop-blur-sm"
              >
                <div className="text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">That's a wrap</div>
                  <div className="mt-2 text-xl font-semibold sm:text-2xl">{title}</div>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={yt.toggle}
                      className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/20"
                    >
                      <RotateCcw size={16} /> Replay
                    </button>
                    {cta && (
                      <a
                        href={cta.href}
                onClick={() => cta.onClick?.()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                        style={{ background: cta.color }}
                      >
                        <ExternalLink size={15} /> {cta.label}
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/85 px-6 text-center">
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

      {/* ---------- Console: controls live in the room, not over the picture ---------- */}
      <motion.div
        className="absolute z-20"
        style={{ left: L, width: W, top: consoleTop }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ delay: delay + 0.1, duration: 0.45 }}
      >
        <div className="flex items-center gap-3">
          <span className="w-11 text-right text-xs tabular-nums text-white/65">{clock(scrub ?? pos)}</span>
          <input
            type="range"
            aria-label="Seek"
            className="scrubber block flex-1"
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
          <span className="w-11 text-xs tabular-nums text-white/45">{clock(dur)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={yt.toggle}
            aria-label={isPlaying ? "Pause" : ended ? "Replay" : "Play"}
            className="grid size-12 place-items-center rounded-full bg-white text-ink transition hover:brightness-90"
          >
            {ended ? <RotateCcw size={20} /> : isPlaying ? <Pause size={22} className="fill-ink" /> : <Play size={22} className="ml-0.5 fill-ink" />}
          </button>
          <button
            onClick={yt.toggleMute}
            aria-label={muted || vol === 0 ? "Unmute" : "Mute"}
            className={iconBtn}
          >
            {muted || vol === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range"
            aria-label="Volume"
            className="scrubber hidden w-24 sm:block"
            min={0}
            max={100}
            value={muted ? 0 : vol}
            style={{ "--p": `${muted ? 0 : vol}%` }}
            onChange={(e) => yt.setVolume(Number(e.target.value))}
          />
          {!narrow && (
            <button
              onClick={() => setFit((f) => !f)}
              aria-pressed={fit}
              title={fit ? "Fill the wide screen (crops the top and bottom)" : "Show the whole picture"}
              className="rounded-full bg-white/10 px-4 py-2.5 text-xs font-medium transition hover:bg-white/20"
            >
              {fit ? "Fit" : "Fill"}
            </button>
          )}
          {document.fullscreenEnabled && (
            <button
              onClick={toggleFull}
              aria-label={full ? "Exit fullscreen" : "Fullscreen"}
              className={iconBtn}
            >
              {full ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          )}
          <span className="flex-1" />
          {cta && (
            <a
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
              yt.pause();
              cta.onClick?.();
            }}
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
            onClick={yt.pause}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium transition hover:bg-white/20"
          >
            <YouTubeMark /> <span className="hidden sm:inline">Watch on YouTube</span>
            <span className="sm:hidden">YouTube</span>
          </a>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
