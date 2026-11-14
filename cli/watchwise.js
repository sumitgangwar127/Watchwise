#!/usr/bin/env node
// Watchwise command line. The UI, the daily job and AI chat all use these same commands.
// Run through npm so .env is loaded: `npm run status`, `npm run refresh`.
import { refreshCatalog } from "../server/catalog.js";
import { counts, getProfile } from "../server/db.js";
import { listJobs, runDueJobs, runJob } from "../server/jobs.js";
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
} else if (cmd === "jobs") {
  // npm run jobs                  list the scheduled jobs
  // npm run jobs -- run <id>      run one now
  // npm run jobs -- run-due       run whatever is due, then exit (for cron or launchd)
  const [, sub, id] = process.argv.slice(2);
  const show = (r) => console.log(`${r.status.toUpperCase().padEnd(8)} ${r.id}: ${r.message} (${r.durationMs} ms)`);
  try {
    if (sub === "run" && id) show(await runJob(id, "cli"));
    else if (sub === "run-due") {
      const results = await runDueJobs("cli");
      if (!results.length) console.log("Nothing is due.");
      results.forEach(show);
    } else {
      for (const j of listJobs()) {
        const state = j.enabled ? `next ${j.nextRunAt ?? "soon"} UTC` : "off";
        console.log(`${j.id.padEnd(18)} every ${String(j.everyHours).padStart(3)}h  ${state.padEnd(28)} last: ${j.lastStatus ?? "never"}${j.lastMessage ? ` (${j.lastMessage})` : ""}`);
      }
    }
  } catch (e) {
    console.error("Jobs failed:", e.message);
    process.exitCode = 1;
  } finally {
    closeTmdb();
  }
} else if (planned.includes(cmd)) {
  console.log(`'${cmd}' is not implemented yet.`);
  process.exit(1);
} else {
  console.log("Usage: watchwise <status | refresh | jobs | find-new | log-watched | recommend>");
  console.log("Implemented: status, refresh, jobs. The rest are planned.");
}
