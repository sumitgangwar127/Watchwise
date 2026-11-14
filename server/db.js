import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
export const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, "watchwise.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
db.exec(readFileSync(join(here, "schema.sql"), "utf8"));

// Lightweight migrations for databases created before these columns existed.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}
ensureColumn("titles", "backdrop_url", "TEXT");
ensureColumn("titles", "release_date", "TEXT");
ensureColumn("titles", "language", "TEXT");
ensureColumn("availability", "link", "TEXT");
ensureColumn("titles", "avail_checked_at", "TEXT");

export function getProfile() {
  const rows = db.prepare("SELECT key, value FROM profile").all();
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

export function setProfile(key, value) {
  db.prepare(
    "INSERT INTO profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(value));
}

export function counts() {
  const n = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  return {
    titles: n("titles"),
    history: n("history"),
    suggestions: n("suggestions"),
    runs: n("runs"),
  };
}
