import { brand } from "../../data/mockData";

function LogoMark({ className = "h-10 w-10" }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect width="40" height="40" rx="9" fill="#1e3a8a" />
      <path
        d="M20 8L9 15.5v3c0 8.2 5.6 15.8 11 17.5 5.4-1.7 11-9.3 11-17.5v-3L20 8z"
        fill="#fbbf24"
      />
      <text
        x="20"
        y="22.5"
        textAnchor="middle"
        fill="#1e3a8a"
        fontFamily="Arial,Helvetica,sans-serif"
        fontSize="7"
        fontWeight="700"
      >
        OHS
      </text>
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
