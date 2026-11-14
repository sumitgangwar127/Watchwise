import http2 from "node:http2";

const HOST = "https://api.themoviedb.org";
export const IMG = "https://image.tmdb.org/t/p";

export class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

export const tmdbConfigured = () => Boolean(process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// api.themoviedb.org accepts HTTP/2, and on some networks it resets plain HTTP/1.1
// connections (which Node's fetch uses). So requests go over one shared HTTP/2 session,
// with fetch as a fallback if HTTP/2 can't connect.
let session = null;
function getSession() {
  if (session && !session.closed && !session.destroyed) return session;
  const s = http2.connect(HOST);
  s.on("error", () => {
    if (session === s) session = null;
  });
  s.on("close", () => {
    if (session === s) session = null;
  });
  s.setTimeout(60000, () => s.close());
  return (session = s);
}

/** Close the shared connection (the CLI calls this so the process can exit). */
export function closeTmdb() {
  session?.close();
  session = null;
}

function viaHttp2(pathAndQuery, headers) {
  return new Promise((resolve, reject) => {
    const req = getSession().request({ ":method": "GET", ":path": pathAndQuery, ...headers });
    const chunks = [];
    let status = 0;
    let retryAfter = null;
    req.on("response", (h) => {
      status = h[":status"];
      retryAfter = h["retry-after"] ?? null;
    });
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve({ status, retryAfter, text: Buffer.concat(chunks).toString("utf8") }));
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.close();
      reject(new Error("TMDB request timed out"));
    });
    req.end();
  });
}

async function viaFetch(pathAndQuery, headers) {
  const res = await fetch(HOST + pathAndQuery, { headers, signal: AbortSignal.timeout(15000) });
  return { status: res.status, retryAfter: res.headers.get("retry-after"), text: await res.text() };
}

/**
 * Minimal TMDB v3 client. Server-side only: the token is never sent to the browser.
 * Error messages never include the request URL, so the key can't leak into logs.
 */
export async function tmdb(path, params = {}, retries = 2) {
  if (!tmdbConfigured()) throw new TmdbError("TMDB is not configured. Add TMDB_ACCESS_TOKEN to .env", 0);

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) query.set(k, String(v));
  }
  const headers = { accept: "application/json", "user-agent": "watchwise" };
  if (process.env.TMDB_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.TMDB_ACCESS_TOKEN}`;
  else query.set("api_key", process.env.TMDB_API_KEY);
  const pathAndQuery = `/3${path}?${query}`;

  let res;
  try {
    res = await viaHttp2(pathAndQuery, headers);
  } catch {
    session = null;
    res = await viaFetch(pathAndQuery, headers);
  }

  if (res.status === 429 && retries > 0) {
    await sleep((Number(res.retryAfter) || 1) * 1000);
    return tmdb(path, params, retries - 1);
  }
  let body = {};
  try {
    body = JSON.parse(res.text);
  } catch {
    /* non-JSON error page */
  }
  if (res.status < 200 || res.status >= 300) {
    throw new TmdbError(body.status_message ?? `TMDB returned HTTP ${res.status}`, res.status);
  }
  return body;
}
