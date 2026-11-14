/** Generated poster art from a title's palette. Replaced by real posters once the catalog has them. */
export default function Poster({ t, className = "", showTitle = true }) {
  const [a, b] = t.palette;
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-xl ${className}`}
      style={{ background: `linear-gradient(155deg, ${a} 0%, ${b} 78%)` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.3),transparent_55%)]" />
      <div className="absolute -bottom-8 -right-8 size-32 rounded-full opacity-60 blur-2xl" style={{ background: a }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      {showTitle && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
            {t.type === "movie" ? "Film" : "Series"}
          </div>
          <div className="mt-1 line-clamp-3 text-[15px] font-extrabold leading-tight tracking-tight text-white">
            {t.title}
          </div>
        </div>
      )}
    </div>
  );
}
