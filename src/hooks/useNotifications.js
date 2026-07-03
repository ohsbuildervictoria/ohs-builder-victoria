import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { complianceCategories } from "../data/constants";
import { saveReadNotifications } from "../lib/api";

// { notifications, unreadCount, markRead, markAllRead }
// Auto-generates notifications from: incidents, compliance lapses, pending SWMS.
// Read state persists per user in profiles.read_notifications.
export function useNotifications() {
  const { incidents, workers, templates, readNotifications, setReadNotifications } =
    useAppContext();
  const { user } = useAuthContext();

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

  const persist = useCallback(
    (idSet) => {
      if (user?.id) {
        saveReadNotifications(user.id, [...idSet]).catch(() => {});
      }
    },
    [user]
  );

  const markRead = useCallback(
    (id) => {
      setReadNotifications((prev) => {
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [setReadNotifications, persist]
  );

  const markAllRead = useCallback(() => {
    const next = new Set(generated.map((n) => n.id));
    setReadNotifications(next);
    persist(next);
  }, [generated, setReadNotifications, persist]);

  return { notifications, unreadCount, markRead, markAllRead };
}
