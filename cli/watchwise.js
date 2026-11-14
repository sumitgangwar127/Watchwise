#!/usr/bin/env node
// Watchwise command line. The UI, the daily job and AI chat all use these same commands.
// Run through npm so .env is loaded: `npm run status`, `npm run refresh`.
import { refreshCatalog } from "../server/catalog.js";
import { counts, getProfile } from "../server/db.js";
import { detectProviders } from "../server/providers/index.js";
import { closeTmdb, tmdbConfigured } from "../server/tmdb.js";

const [cmd = "help"] = process.argv.slice(2);

const planned = ["find-new", "log-watched", "recommend"];

if (cmd === "status") {
  const profile = getProfile();
  console.log("Onboarded:", Boolean(profile.onboarded));
  console.log("TMDB configured:", tmdbConfigured());
  console.log("Counts:", counts());
  console.log("AI CLIs:");
  for (const p of detectProviders()) {
    console.log(`  ${p.installed ? "✔" : "✘"} ${p.name} (${p.bin})`);
  }
} else if (cmd === "refresh") {
  try {
    const r = await refreshCatalog("manual");
    console.log(`Catalog updated for ${r.region}: ${r.added} added, ${r.updated} updated, ${r.total} titles checked.`);
  } catch (e) {
    console.error("Refresh failed:", e.message);
    process.exitCode = 1;
  } finally {
    closeTmdb();
  }
} else if (planned.includes(cmd)) {
  console.log(`'${cmd}' is not implemented yet.`);
  process.exit(1);
} else {
  console.log("Usage: watchwise <status | refresh | find-new | log-watched | recommend>");
  console.log("Implemented: status, refresh. The rest are planned.");
}
