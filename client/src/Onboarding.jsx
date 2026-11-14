import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, Sparkles, UserX, Wallet } from "lucide-react";
import { COUNTRIES, GENRES, flag, guessCountry, platformsFor } from "./data.js";
import { Chip, GhostButton, Glow, Heading, PrimaryButton, Ticket, Words, fade } from "./ui.jsx";
import Backdrop from "./components/Backdrop.jsx";
import Logo from "./components/Logo.jsx";
import Building from "./Building.jsx";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "country", label: "Your country" },
  { id: "platforms", label: "Your platforms" },
  { id: "ai", label: "Your AI" },
  { id: "taste", label: "Your taste" },
  { id: "history", label: "Watch history" },
];

const lines = (text, sep) =>
  text
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);

const slide = {
  enter: (d) => ({ opacity: 0, x: d * 48, filter: "blur(6px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (d) => ({ opacity: 0, x: d * -48, filter: "blur(6px)" }),
};

function PlatformTile({ p, active, onClick, index }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.5), duration: 0.35 }}
      whileTap={{ scale: 0.96 }}
      className="flex items-stretch overflow-hidden rounded-xl border text-left transition-colors"
      style={{
        borderColor: active ? p.color : "var(--color-edge)",
        background: active ? `${p.color}26` : "rgba(255,255,255,0.03)",
        boxShadow: active ? `0 12px 40px -14px ${p.color}` : "none",
      }}
    >
      <span className="grid w-12 shrink-0 place-items-center text-sm font-black text-white" style={{ background: p.color }}>
        {p.mono}
      </span>
      <span className="flex flex-1 items-center justify-between gap-2 border-l border-dashed border-white/20 px-3 py-3.5 text-sm">
        {p.name}
        {active && <Check size={15} className="shrink-0 text-accent" />}
      </span>
    </motion.button>
  );
}

export default function Onboarding({ providers, onComplete }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState("questions"); // questions | building
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    country: guessCountry(),
    platforms: [],
    provider: providers.find((p) => p.installed)?.id ?? null,
    genres: [],
    favorites: "",
    history: "",
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const available = useMemo(() => platformsFor(form.country), [form.country]);
  const noneInstalled = !providers.some((p) => p.installed);
  const id = STEPS[step].id;
  const kicker = `Admit one · ${String(step + 1).padStart(2, "0")}/${String(STEPS.length).padStart(2, "0")}`;

  const canContinue = {
    welcome: true,
    country: Boolean(form.country),
    platforms: form.platforms.length > 0,
    ai: Boolean(form.provider) || noneInstalled,
    taste: form.genres.length > 0,
    history: true,
  }[id];

  const onCountry = (country) => {
    const keep = new Set(platformsFor(country).map((p) => p.id));
    setForm((f) => ({ ...f, country, platforms: f.platforms.filter((p) => keep.has(p)) }));
  };

  const go = (d) => {
    setDir(d);
    setStep((s) => s + d);
  };

  async function next() {
    if (step < STEPS.length - 1) return go(1);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          country: form.country,
          platforms: form.platforms,
          provider: form.provider,
          genres: form.genres,
          favorites: lines(form.favorites, /\n|,/),
          history: lines(form.history, /\n/),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save");
      setPhase("building");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (phase === "building") {
    const countryName = COUNTRIES.find(([c]) => c === form.country)?.[1] ?? form.country;
    const providerName = providers.find((p) => p.id === form.provider)?.name ?? null;
    return <Building country={countryName} provider={providerName} onDone={onComplete} />;
  }

  return (
    <div className="relative flex min-h-dvh flex-col lg:flex-row">
      <Backdrop className="opacity-[0.1]" />
      <Glow />

      {/* Desktop side rail */}
      <aside className="relative hidden w-80 shrink-0 flex-col border-r border-edge/70 bg-ink/40 p-10 backdrop-blur-sm lg:flex">
        <Logo />
        <ol className="mt-14 space-y-5">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <motion.span
                animate={{ scale: i === step ? 1.12 : 1 }}
                className={[
                  "grid size-7 place-items-center rounded-full border text-xs transition-colors",
                  i < step
                    ? "border-accent bg-accent text-ink"
                    : i === step
                      ? "border-accent text-accent"
                      : "border-edge text-white/35",
                ].join(" ")}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </motion.span>
              <span className={i === step ? "text-white" : i < step ? "text-white/65" : "text-white/35"}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-auto">
          <p className="text-xs leading-relaxed text-white/35">Everything you enter stays on this computer.</p>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Mobile / tablet header */}
        <header className="px-5 pt-5 md:px-10 lg:hidden">
          <div className="flex items-center justify-between">
            <Logo size={28} />
            <span className="text-xs text-white/40">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className="block h-full bg-gradient-to-r from-accent to-amber"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </span>
            ))}
          </div>
        </header>

        <main className="flex-1 px-5 py-8 md:px-10 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={id}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {id === "welcome" && (
                  <>
                    <Ticket>Tonight's feature</Ticket>
                    <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
                      <Words text="Stop scrolling." />
                      <br />
                      <Words
                        text="Start watching."
                        wordClass="bg-gradient-to-r from-accent to-amber bg-clip-text text-transparent"
                      />
                    </h1>
                    <motion.p {...fade(5)} className="mt-5 max-w-lg text-lg text-white/60">
                      One taste profile across every streaming app, powered by the AI you already have. Setup takes
                      about a minute.
                    </motion.p>
                    <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                      {[
                        [Lock, "Private", "Your data never leaves your computer."],
                        [UserX, "No login", "No account, no tracking."],
                        [Wallet, "Free", "Uses your own AI, no subscription."],
                      ].map(([Icon, t, d], i) => (
                        <motion.li
                          key={t}
                          {...fade(7 + i)}
                          className="rounded-2xl border border-edge bg-panel/70 p-4 backdrop-blur"
                        >
                          <Icon size={18} className="text-accent" />
                          <div className="mt-3 text-sm font-medium">{t}</div>
                          <div className="mt-1 text-sm text-white/50">{d}</div>
                        </motion.li>
                      ))}
                    </ul>
                  </>
                )}

                {id === "country" && (
                  <>
                    <Heading
                      kicker={kicker}
                      title="Where are you watching from?"
                      sub="Streaming catalogs differ by country. This decides what we show as available to you."
                    />
                    <div className="mb-5 flex items-center gap-4">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={form.country || "none"}
                          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 16 }}
                          className="text-6xl leading-none"
                        >
                          {flag(form.country)}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <select
                      value={form.country}
                      onChange={(e) => onCountry(e.target.value)}
                      className="w-full rounded-2xl border border-edge bg-panel px-4 py-4 text-base text-white outline-none transition [color-scheme:dark] focus:border-accent"
                    >
                      <option value="" disabled>
                        Select your country
                      </option>
                      {COUNTRIES.map(([code, name]) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {id === "platforms" && (
                  <>
                    <Heading
                      kicker={kicker}
                      title="Which platforms do you use?"
                      sub="Pick everything you have access to. We'll only recommend what you can actually watch."
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {available.map((p, i) => (
                        <PlatformTile
                          key={p.id}
                          p={p}
                          index={i}
                          active={form.platforms.includes(p.id)}
                          onClick={() => toggle("platforms", p.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {id === "ai" && (
                  <>
                    <Heading
                      kicker={kicker}
                      title="Pick your AI"
                      sub="Watchwise runs the AI command line already installed on your computer. It does the thinking, and nothing is sent to us."
                    />
                    <div className="space-y-3">
                      {providers.map((p, i) => (
                        <motion.button
                          key={p.id}
                          type="button"
                          disabled={!p.installed}
                          onClick={() => set({ provider: p.id })}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          whileTap={{ scale: 0.985 }}
                          className={[
                            "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors",
                            form.provider === p.id
                              ? "border-accent bg-accent/10 shadow-[0_12px_40px_-16px_rgba(242,196,109,0.7)]"
                              : "border-edge bg-panel/70 hover:border-white/25",
                            !p.installed ? "cursor-not-allowed opacity-40" : "",
                          ].join(" ")}
                        >
                          <span className="flex items-center gap-4">
                            <span className="grid size-10 place-items-center rounded-xl bg-white/5 text-sm font-bold text-accent">
                              {p.name[0]}
                            </span>
                            <span>
                              <span className="block font-medium">{p.name}</span>
                              <span className="block text-sm text-white/45">
                                {p.installed ? `Detected (${p.bin})` : `Not installed (${p.bin})`}
                              </span>
                            </span>
                          </span>
                          {form.provider === p.id && <Check size={18} className="text-accent" />}
                        </motion.button>
                      ))}
                    </div>
                    {noneInstalled ? (
                      <p className="mt-5 text-sm text-amber-300/80">
                        No supported AI found. You can continue and install one later, but recommendations need one.
                      </p>
                    ) : (
                      <p className="mt-5 text-sm text-white/40">
                        Daily discovery works best with an AI that can search the web.
                      </p>
                    )}
                  </>
                )}

                {id === "taste" && (
                  <>
                    <Heading
                      kicker={kicker}
                      title="What are you into?"
                      sub="Choose a few genres, then list some favorites. This is the starting point for your profile."
                    />
                    <div className="flex flex-wrap gap-2.5">
                      {GENRES.map((g, i) => (
                        <Chip key={g} index={i} active={form.genres.includes(g)} onClick={() => toggle("genres", g)}>
                          {g}
                        </Chip>
                      ))}
                    </div>
                    <label className="mt-8 block text-sm text-white/60" htmlFor="favs">
                      Movies or shows you love (one per line, optional)
                    </label>
                    <textarea
                      id="favs"
                      rows={4}
                      value={form.favorites}
                      onChange={(e) => set({ favorites: e.target.value })}
                      placeholder={"Dark\nParasite\nBreaking Bad"}
                      className="mt-2 w-full resize-none rounded-2xl border border-edge bg-panel px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-accent"
                    />
                  </>
                )}

                {id === "history" && (
                  <>
                    <Heading
                      kicker={kicker}
                      title="Anything you've watched?"
                      sub="Optional. Paste titles you've already seen, one per line. Netflix and Prime let you download your viewing history, and you can paste titles from that too."
                    />
                    <textarea
                      rows={8}
                      value={form.history}
                      onChange={(e) => set({ history: e.target.value })}
                      placeholder={"Inception\nThe Bear\nMoney Heist"}
                      className="w-full resize-none rounded-2xl border border-edge bg-panel px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-accent"
                    />
                    <p className="mt-3 text-sm text-white/40">You can skip this and add history later.</p>
                    {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-edge/70 bg-ink/80 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:px-10 lg:px-16">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <GhostButton onClick={() => go(-1)} disabled={step === 0 || saving}>
              <span className="flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </span>
            </GhostButton>
            <PrimaryButton onClick={next} disabled={!canContinue || saving}>
              <span className="flex items-center gap-2">
                {step === STEPS.length - 1 ? (
                  <>
                    <Sparkles size={16} /> {saving ? "Saving…" : "Roll the film"}
                  </>
                ) : (
                  <>
                    {id === "welcome" ? "Take your seat" : "Continue"} <ArrowRight size={16} />
                  </>
                )}
              </span>
            </PrimaryButton>
          </div>
        </footer>
      </div>
    </div>
  );
}
