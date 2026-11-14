import { motion } from "framer-motion";

export function Chip({ active, disabled, onClick, children, index = 0 }) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.025, 0.5), duration: 0.35 }}
      whileTap={{ scale: 0.94 }}
      className={[
        "rounded-full border px-4 py-2 text-sm transition-colors",
        active
          ? "border-accent bg-accent/15 text-white shadow-[0_0_24px_-6px_rgba(242,196,109,0.6)]"
          : "border-edge bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </motion.button>
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="relative overflow-hidden rounded-full bg-gradient-to-r from-accent to-amber px-7 py-3 text-sm font-semibold text-ink shadow-[0_8px_30px_-8px_rgba(242,196,109,0.7)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
    >
      <span className="relative">{children}</span>
    </button>
  );
}

export function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-full px-5 py-3 text-sm text-white/60 transition hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Projector beam and warm room glow. Sits behind everything and stays still. */
export function Glow({ beam = true }) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {beam && <div className="beam absolute left-1/2 top-0 h-[85vh] w-[120vw] -translate-x-1/2" />}
      <div className="absolute -bottom-40 left-1/2 size-[720px] -translate-x-1/2 rounded-full bg-velvet/25 blur-[160px]" />
      <div className="absolute -top-20 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
    </div>
  );
}

export const fade = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.07, ease: "easeOut" },
});

/** Word-by-word reveal for headings. */
export function Words({ text, className = "", wordClass = "" }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`mr-[0.28em] inline-block ${wordClass}`}
          initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.05 + i * 0.06, ease: "easeOut" }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

/** Ticket-stub kicker, e.g. "ADMIT ONE · 02/06". */
export function Ticket({ children }) {
  return (
    <div className="mb-5 inline-flex items-center gap-3 rounded-md border border-dashed border-accent/40 bg-accent/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
      <span className="size-1.5 rounded-full bg-accent" />
      {children}
    </div>
  );
}

export function Heading({ title, sub, kicker }) {
  return (
    <div className="mb-8">
      {kicker && <Ticket>{kicker}</Ticket>}
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        <Words text={title} />
      </h2>
      {sub && (
        <motion.p {...fade(3)} className="mt-3 max-w-xl text-white/55">
          {sub}
        </motion.p>
      )}
    </div>
  );
}
