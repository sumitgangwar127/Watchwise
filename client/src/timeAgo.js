// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC
const parse = (s) => Date.parse(`${s.replace(" ", "T")}Z`);

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(s) {
  if (!s) return "never";
  const sec = Math.round((Date.now() - parse(s)) / 1000);
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  return `${Math.round(sec / 86400)} days ago`;
}

/** "in 5 min", "in 3 h", "in 2 days", or "due now". */
export function timeUntil(s) {
  if (!s) return "soon";
  const sec = Math.round((parse(s) - Date.now()) / 1000);
  if (sec <= 60) return "due now";
  if (sec < 3600) return `in ${Math.round(sec / 60)} min`;
  if (sec < 86400) return `in ${Math.round(sec / 3600)} h`;
  return `in ${Math.round(sec / 86400)} days`;
}
