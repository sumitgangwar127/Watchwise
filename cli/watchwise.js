#!/usr/bin/env node
// Watchwise command line. The UI, the daily job and AI chat all use these same commands.
import { counts, getProfile } from "../server/db.js";
import { detectProviders } from "../server/providers/index.js";

const [cmd = "help"] = process.argv.slice(2);

const planned = ["refresh", "find-new", "log-watched", "recommend"];

if (cmd === "status") {
  const profile = getProfile();
  console.log("Onboarded:", Boolean(profile.onboarded));
  console.log("Counts:", counts());
  console.log("AI CLIs:");
  for (const p of detectProviders()) {
    console.log(`  ${p.installed ? "✔" : "✘"} ${p.name} (${p.bin})`);
  }
} else if (planned.includes(cmd)) {
  console.log(`'${cmd}' is not implemented yet.`);
  process.exit(1);
} else {
  console.log("Usage: watchwise <status | refresh | find-new | log-watched | recommend>");
  console.log("Implemented: status. The rest are planned.");
}
