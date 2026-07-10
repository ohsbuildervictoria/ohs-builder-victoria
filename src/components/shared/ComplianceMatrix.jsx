import {
  complianceCategories,
  categoryStatus,
  overallStatus,
  isBlocking,
} from "../../lib/compliance";
import Badge from "../ui/Badge";
import { Table, THead, TBody, TR, TD } from "../ui/Table";

// Worker × 6-category compliance grid. Status per cell comes from the shared
// categoryStatus() in src/lib/compliance.js — the same function the tradie
// Documents tab uses — so the two views can never disagree.
// CRITICAL RULE: any "Missing" or "Expired" item blocks site access (red).
export default function ComplianceMatrix({ workers, docsFor, onCellClick, onEmailInvite }) {
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
          const docs = docsFor?.(w.id) || {};
          const statuses = complianceCategories.map((c) => ({
            key: c.key,
            status: categoryStatus(w, c.key, docs[c.key]),
          }));
          const blocked = statuses.some((s) => isBlocking(s.status));
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
                      title="Site access blocked — missing or expired item"
                      className="inline-flex h-2 w-2 rounded-full bg-red-500"
                    />
                  )}
                  {onEmailInvite && w.accountStatus === "invited" && w.email && (
                    <button
                      type="button"
                      title={`Email the invite link to ${w.email}`}
                      onClick={() => onEmailInvite(w)}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      ✉️ Email invite
                    </button>
                  )}
                </div>
              </TD>
              <TD>{w.trade}</TD>
              {statuses.map(({ key, status }) => (
                <TD key={key}>
                  <button
                    type="button"
                    onClick={() => onCellClick?.(w, key)}
                    className="focus:outline-none"
                    title={onCellClick ? "Click to manage" : undefined}
                  >
                    <Badge status={status} icon />
                  </button>
                </TD>
              ))}
              <TD>
                <Badge status={overallStatus(w, docs)} />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
