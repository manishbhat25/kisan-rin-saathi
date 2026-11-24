export function LeafMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
      <path d="M16 26V13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 15c2.4-4.2 6.6-5.4 8.6-5.4-.8 3.4-3.4 6.2-8.6 7.4z" fill="currentColor" />
      <path d="M16 18c-2.2-3.4-6.4-4.4-8.4-4.4.8 3.2 3.4 5.4 8.4 6.4z" fill="currentColor" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
      <rect x="18" y="6" width="12" height="22" rx="6" fill="currentColor" />
      <path d="M12 22a12 12 0 0 0 24 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 34v6M17 40h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M6 10.2 8.6 13 14 7.5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Waveform() {
  return (
    <span className="flex h-10 items-center gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="wave-bar w-1.5 rounded-full bg-current"
          style={{ height: "1.6rem", animationDelay: `${bar * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export function SoftSpinner() {
  return (
    <span
      className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
      aria-hidden="true"
    />
  );
}
