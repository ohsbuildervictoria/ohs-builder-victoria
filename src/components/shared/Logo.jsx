import { brand } from "../../data/constants";

// ============================================================================
// Product identity.
//   Industry  — hard hat  + "OHS Builder / Victoria"   (builders, stakeholders)
//   Education — grad cap  + "OHS Builder / Education"  (institutions, assessors,
//                                                      students)
// Both marks are inline SVG on the same navy tile with the same amber fill, so
// they read as one family at any size, with no external asset and no layout
// shift. Use <Logo product="education" /> for anything Education-facing; the
// default is the Industry product.
// ============================================================================

// Amber hard hat on a navy tile.
export function HardHatMark({ className = "h-10 w-10", title = "OHS Builder Victoria" }) {
  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 ${className}`} role="img" aria-label={title}>
      <rect width="40" height="40" rx="9" fill="#1e3a8a" />
      {/* dome */}
      <path d="M10.5 24.5v-3.2c0-5.1 4.2-9.3 9.5-9.3s9.5 4.2 9.5 9.3v3.2z" fill="#fbbf24" />
      {/* ridge */}
      <rect x="18.4" y="10.8" width="3.2" height="7.4" rx="1.4" fill="#1e3a8a" opacity="0.9" />
      {/* brim */}
      <rect x="6.5" y="24.3" width="27" height="4.2" rx="2.1" fill="#fbbf24" />
      {/* brim highlight */}
      <rect x="8.5" y="26.6" width="23" height="1.2" rx="0.6" fill="#1e3a8a" opacity="0.55" />
    </svg>
  );
}

// Amber graduation cap (mortarboard + band + tassel) on a navy tile.
export function GradCapMark({ className = "h-10 w-10", title = "OHS Builder Education" }) {
  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 ${className}`} role="img" aria-label={title}>
      <rect width="40" height="40" rx="9" fill="#1e3a8a" />
      {/* mortarboard */}
      <path d="M20 10.5L34 17.2 20 23.9 6 17.2z" fill="#fbbf24" />
      {/* cap band */}
      <path d="M12.2 20.4v5.1c0 2.5 3.5 4.5 7.8 4.5s7.8-2 7.8-4.5v-5.1L20 24.1z" fill="#fbbf24" opacity="0.92" />
      {/* tassel */}
      <path d="M31.8 18.3v8.2" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="31.8" cy="27.6" r="1.7" fill="#fbbf24" />
    </svg>
  );
}

// Small inline icons for nav items and links (inherit currentColor).
export function HardHatIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} aria-hidden fill="currentColor">
      <path d="M4.5 15v-2.2A7.5 7.5 0 0 1 12 5.3a7.5 7.5 0 0 1 7.5 7.5V15z" />
      <rect x="2.2" y="15.2" width="19.6" height="3.2" rx="1.6" />
    </svg>
  );
}

export function GradCapIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} aria-hidden fill="currentColor">
      <path d="M12 3.5L23 8.7 12 13.9 1 8.7z" />
      <path d="M5.8 11.2v4.1c0 2 2.8 3.6 6.2 3.6s6.2-1.6 6.2-3.6v-4.1L12 14.1z" />
      <path d="M21.2 9.6v6.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="21.2" cy="17.2" r="1.3" />
    </svg>
  );
}

export default function Logo({ compact = false, light = false, product = "industry" }) {
  const edu = product === "education";
  const Mark = edu ? GradCapMark : HardHatMark;
  return (
    <div className="flex items-center gap-2.5">
      <Mark />
      {!compact && (
        <div className="leading-tight">
          <p className={`text-sm font-bold ${light ? "text-white" : "text-slate-800"}`}>
            {brand.productName}
          </p>
          <p className={`text-[11px] font-medium ${light ? "text-yellow-400" : "text-yellow-600"}`}>
            {edu ? "Education" : brand.region}
          </p>
        </div>
      )}
    </div>
  );
}
