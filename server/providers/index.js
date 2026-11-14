import { spawnSync } from "node:child_process";

/**
 * AI provider registry. Each provider is a CLI the app can call in headless mode.
 * Adding a new AI = adding one entry here (plus its adapter logic when we build it).
 *
 * NOTE: the headless flags below are placeholders. They must be verified against
 * each CLI's current docs when the adapters are implemented.
 */
export const PROVIDERS = [
  { id: "claude", name: "Claude Code", bin: "claude", args: (prompt) => ["-p", prompt] },
  { id: "codex", name: "Codex CLI", bin: "codex", args: (prompt) => ["exec", prompt] },
  { id: "cursor", name: "Cursor Agent", bin: "cursor-agent", args: (prompt) => ["-p", prompt] },
  { id: "gemini", name: "Gemini CLI", bin: "gemini", args: (prompt) => ["-p", prompt] },
];

const which = process.platform === "win32" ? "where" : "which";

export function detectProviders() {
  return PROVIDERS.map(({ id, name, bin }) => ({
    id,
    name,
    bin,
    installed: spawnSync(which, [bin], { stdio: "ignore" }).status === 0,
  }));
}

/** Cheap check that the CLI actually runs. Does not call the AI. */
export function verifyProvider(id) {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) return { ok: false, detail: "unknown provider" };
  const r = spawnSync(p.bin, ["--version"], { encoding: "utf8", timeout: 8000 });
  if (r.error || r.status !== 0) return { ok: false, detail: "could not run" };
  return { ok: true, detail: r.stdout.trim().split("\n")[0] };
}
