/** A row of flickering marquee bulbs. */
export default function Bulbs({ count = 14, className = "" }) {
  return (
    <div className={`flex items-center justify-between ${className}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="bulb" style={{ animationDelay: `${(i % 4) * 0.35}s` }} />
      ))}
    </div>
  );
}
