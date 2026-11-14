import { useEffect, useState } from "react";
import { hslToHex } from "./dashboard/palette.js";

const cache = new Map();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

/** Two glow colors from the most prominent hues in an image. Throws if the canvas is tainted. */
function extract(img) {
  const W = 32;
  const H = 48;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.12 || l > 0.92 || s < 0.2) continue; // skip near-black, near-white and grey
    const w = s * (1 - Math.abs(l - 0.5) * 1.2);
    const b = buckets[Math.floor(h / 30) % 12];
    b.w += w;
    b.r += data[i] * w;
    b.g += data[i + 1] * w;
    b.b += data[i + 2] * w;
  }
  const ranked = buckets
    .map((b, i) => ({ ...b, i }))
    .filter((b) => b.w > 0)
    .sort((a, b) => b.w - a.w);
  if (!ranked.length) throw new Error("no colour");

  const hsl = (b) => rgbToHsl(b.r / b.w, b.g / b.w, b.b / b.w);
  const ringDistance = (a, b) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b));
  const second = ranked.find((b) => ringDistance(b.i, ranked[0].i) >= 2) ?? ranked[1] ?? ranked[0];

  // Tuned to glow nicely on a dark page: never muddy, never neon
  const tune = ([h, s, l]) => hslToHex(h, clamp(s, 0.5, 0.9) * 100, clamp(l, 0.4, 0.58) * 100);
  return [tune(hsl(ranked[0])), tune(hsl(second))];
}

/**
 * Dominant colors of a poster, for ambient lighting. Falls back to `fallback`
 * (two hex colors) while loading or if the image can't be read.
 */
export function useDominantColors(src, fallback) {
  const [colors, setColors] = useState(() => cache.get(src) ?? fallback);

  useEffect(() => {
    if (!src) {
      setColors(fallback);
      return;
    }
    if (cache.has(src)) {
      setColors(cache.get(src));
      return;
    }
    let off = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = extract(img);
        cache.set(src, c);
        if (!off) setColors(c);
      } catch {
        if (!off) setColors(fallback);
      }
    };
    img.onerror = () => !off && setColors(fallback);
    img.src = src;
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fallback[0], fallback[1]]);

  return colors;
}


// ---------------------------------------------------------------------------
// Ambient timeline: glow colors that follow a video's playhead.
// The video itself can't be read (it's a cross-origin player), so colors are sampled from a few
// of its frames and stills, then blended smoothly as playback moves between them.
// ---------------------------------------------------------------------------

/** Dominant glow colors of one image. Cached. Rejects if the image can't be read. */
export function extractFromUrl(src) {
  if (cache.has(src)) return Promise.resolve(cache.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = extract(img);
        cache.set(src, c);
        resolve(c);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a, b, f) => {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * f));
};

/**
 * `sets` is a list of candidate point lists in order of preference, each `[{ at: 0..1, src }]`.
 * The first list with at least two readable images is used. `progress` is playback position 0..1.
 * Returns two hex colors, blended between the nearest sampled points.
 */
export function useAmbientTimeline(sets, fallback, progress) {
  const [frames, setFrames] = useState([]); // [{ at, colors }]
  const key = sets.map((set) => set.map((p) => p.src).join(",")).join("|");

  useEffect(() => {
    let off = false;
    (async () => {
      for (const set of sets) {
        const results = await Promise.allSettled(set.map((p) => extractFromUrl(p.src)));
        const ok = set
          .map((p, i) => ({ at: p.at, colors: results[i].status === "fulfilled" ? results[i].value : null }))
          .filter((p) => p.colors);
        if (ok.length >= 2) {
          if (!off) setFrames(ok.sort((a, b) => a.at - b.at));
          return;
        }
      }
      if (!off) setFrames([]);
    })();
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!frames.length) return fallback;
  const p = Math.max(0, Math.min(1, progress || 0));
  if (p <= frames[0].at) return frames[0].colors;
  const last = frames[frames.length - 1];
  if (p >= last.at) return last.colors;
  const i = frames.findIndex((f) => f.at > p);
  const [a, b] = [frames[i - 1], frames[i]];
  const f = (p - a.at) / (b.at - a.at);
  return [mix(a.colors[0], b.colors[0], f), mix(a.colors[1], b.colors[1], f)];
}
