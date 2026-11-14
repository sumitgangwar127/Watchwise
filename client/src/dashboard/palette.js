const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function hex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v) => Math.round(255 * v).toString(16).padStart(2, "0");
  return `#${x(f(0))}${x(f(8))}${x(f(4))}`;
}

/** Stable two-color palette for titles that have no poster art of their own. */
export function paletteFor(id) {
  const h = hash(id) % 360;
  return [hex(h, 70, 55), hex((h + 40) % 360, 55, 14)];
}

/** True if a release date is within roughly the last two and a half months, or just upcoming. */
export function isRecent(released) {
  if (!released) return false;
  const days = (Date.now() - Date.parse(released)) / 864e5;
  return days >= -14 && days <= 75;
}
