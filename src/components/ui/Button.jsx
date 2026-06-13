const VARIANTS = {
  primary: "bg-blue-900 text-white hover:bg-blue-800 focus:ring-blue-900",
  gold: "bg-yellow-500 text-blue-950 hover:bg-yellow-400 focus:ring-yellow-500",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
  danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
  success: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-500",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300",
};

const SIZES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
