import { brand } from "../../data/constants";

// OHS Builder Victoria mark — navy tile, amber safety shield, navy tick.
function LogoMark({ className = "h-10 w-10" }) {
  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#1e3a8a" />
      <path
        d="M20 6.5L30.5 10.8v7.9c0 7.4-4.5 12.9-10.5 14.8-6-1.9-10.5-7.4-10.5-14.8v-7.9L20 6.5z"
        fill="#fbbf24"
      />
      <path
        d="M14.6 20.4l3.9 3.9 7-8.2"
        fill="none"
        stroke="#1e3a8a"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <p
            className={`text-sm font-bold ${light ? "text-white" : "text-slate-800"}`}
          >
            {brand.productName}
          </p>
          <p
            className={`text-[11px] font-medium ${
              light ? "text-yellow-400" : "text-yellow-600"
            }`}
          >
            {brand.region}
          </p>
        </div>
      )}
    </div>
  );
}
