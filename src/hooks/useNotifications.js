import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { complianceCategories } from "../data/mockData";

// { notifications, unreadCount, markRead, markAllRead }
// Auto-generates notifications from: incidents, compliance lapses, pending SWMS.
export function useNotifications() {
  const { incidents, workers, templates, readNotifications, setReadNotifications } =
    useAppContext();

  const generated = useMemo(() => {
    const list = [];

    // Open / notifiable incidents
    incidents.forEach((i) => {
      if (i.notifiable) {
        list.push({
          id: `incident-notifiable-${i.id}`,
          type: "incident",
          severity: "urgent",
          title: "WorkSafe Notifiable Incident",
          message: `${i.description} (${i.project})`,
        });
      } else if (i.status === "Open" || i.status === "Investigating") {
        list.push({
          id: `incident-${i.id}`,
          type: "incident",
          severity: "high",
          title: `${i.type} — ${i.status}`,
          message: `${i.description} (${i.project})`,
        });
      }
    });

    // Compliance lapses (any worker with a Missing or Pending item)
    workers.forEach((w) => {
      const missing = complianceCategories
        .filter((c) => w[c.key] === "Missing")
        .map((c) => c.label);
      const pending = complianceCategories
        .filter((c) => w[c.key] === "Pending")
        .map((c) => c.label);
      if (missing.length) {
        list.push({
          id: `compliance-missing-${w.id}`,
          type: "compliance",
          severity: "high",
          title: `${w.name} — Site access blocked`,
          message: `Missing: ${missing.join(", ")}`,
        });
      } else if (pending.length) {
        list.push({
          id: `compliance-pending-${w.id}`,
          type: "compliance",
          severity: "medium",
          title: `${w.name} — Action required`,
          message: `Pending: ${pending.join(", ")}`,
        });
      }
    });

    // Pending SWMS sign-offs
    templates.forEach((t) => {
      if (t.signed < t.total) {
        list.push({
          id: `swms-${t.id}`,
          type: "swms",
          severity: "medium",
          title: `${t.trade} SWMS ${t.version}`,
          message: `${t.signed}/${t.total} signed — sign-off pending`,
        });
      }
    });

    return list;
  }, [incidents, workers, templates]);

  const notifications = useMemo(
    () => generated.map((n) => ({ ...n, read: readNotifications.has(n.id) })),
    [generated, readNotifications]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markRead = useCallback(
    (id) => {
      setReadNotifications((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [setReadNotifications]
  );

  const markAllRead = useCallback(() => {
    setReadNotifications(new Set(generated.map((n) => n.id)));
  }, [generated, setReadNotifications]);

  return { notifications, unreadCount, markRead, markAllRead };
}
