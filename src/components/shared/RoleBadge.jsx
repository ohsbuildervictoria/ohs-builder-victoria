import { roleLabels } from "../../data/constants";

const STYLES = {
  builder_admin: "bg-blue-900 text-white",
  hse_manager: "bg-blue-100 text-blue-800",
  site_supervisor: "bg-slate-200 text-slate-700",
  worker: "bg-yellow-100 text-yellow-800",
};

export default function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
        STYLES[role] || "bg-slate-100 text-slate-600"
      }`}
    >
      {roleLabels[role] || role}
    </span>
  );
}
