import { complianceCategories } from "../../data/constants";
import Badge from "../ui/Badge";
import { Table, THead, TBody, TR, TD } from "../ui/Table";

// Worker × 6-category compliance grid.
// CRITICAL RULE: a worker with ANY "Missing" item is flagged red (no site access).
export default function ComplianceMatrix({ workers, onCellClick }) {
  const columns = [
    "Stakeholder",
    "Trade",
    ...complianceCategories.map((c) => c.label),
    "Overall Status",
  ];

  return (
    <Table>
      <THead columns={columns} />
      <TBody>
        {workers.map((w) => {
          const blocked = complianceCategories.some((c) => w[c.key] === "Missing");
          return (
            <TR
              key={w.id}
              className={blocked ? "bg-red-50/60 hover:bg-red-50" : ""}
            >
              <TD className="font-medium text-slate-800">
                <div className="flex items-center gap-2">
                  {w.name}
                  {blocked && (
                    <span
                      title="Site access blocked — missing compliance item"
                      className="inline-flex h-2 w-2 rounded-full bg-red-500"
                    />
                  )}
                </div>
              </TD>
              <TD>{w.trade}</TD>
              {complianceCategories.map((c) => (
                <TD key={c.key}>
                  <button
                    type="button"
                    onClick={() => onCellClick?.(w, c.key)}
                    className="focus:outline-none"
                    title={onCellClick ? "Click to update" : undefined}
                  >
                    <Badge status={w[c.key]} icon />
                  </button>
                </TD>
              ))}
              <TD>
                <Badge status={w.status} />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
