import { Clapperboard } from "lucide-react";

export default function Logo({ size = 32, text = true, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="grid place-items-center rounded-xl bg-gradient-to-br from-accent to-amber text-ink shadow-[0_0_24px_-4px_rgba(242,196,109,0.6)]"
        style={{ width: size, height: size }}
      >
        <Clapperboard size={size * 0.55} strokeWidth={2.2} />
      </span>
      {text && <span className="text-sm font-semibold tracking-[0.18em] text-white/85">WATCHWISE</span>}
    </span>
  );
}
