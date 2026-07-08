import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import {
  complianceCategories,
  categoryStatus,
  indexDocuments,
} from "../lib/compliance";
import { saveReadNotifications } from "../lib/api";

// Evaluated once per load — keeps the "how many days ago" maths pure.
const NOW_MS = Date.now();
const DAY = 86_400_000;
const NUDGE_AFTER_DAYS = 3;

const daysAgo = (iso) => (iso ? Math.floor((NOW_MS - new Date(iso).getTime()) / DAY) : 0);

// { notifications, unreadCount, markRead, markAllRead }
// Auto-generates notifications from: incidents, compliance lapses (with a
// 3-day overdue nudge), unclaimed subbie invites, and pending SWMS.
// Read state persists per user in profiles.read_notifications.
export function useNotifications() {
  const { incidents, workers, templates, documents, readNotifications, setReadNotifications } =
    useAppContext();
  const { user } = useAuthContext();

  const generated = useMemo(() => {
    const list = [];
    const docsByWorker = indexDocuments(documents);

    // Open / notifiable incidents → alert the builder.
    incidents.forEach((i) => {
      if (i.notifiable) {
        list.push({
          id: `incident-notifiable-${i.id}`,
          type: "incident",
          severity: "urgent",
          title: "WorkSafe Notifiable Incident",
          message: `${i.description} (${i.project})`,
          link: "/builder/incidents",
        });
      } else if (i.status === "Open" || i.status === "Investigating") {
        list.push({
          id: `incident-${i.id}`,
          type: "incident",
          severity: "high",
          title: `${i.type} — ${i.status}`,
          message: `${i.description} (${i.project})`,
          link: "/builder/incidents",
        });
      }
    });

    // Unclaimed subbie invites → prompt the builder to (re)send the link.
    workers.forEach((w) => {
      if (w.accountStatus === "invited" && w.inviteToken) {
        const age = daysAgo(w.createdAt);
        list.push({
          id: `invite-${w.id}`,
          type: "invite",
          severity: age >= NUDGE_AFTER_DAYS ? "high" : "medium",
          title: `${w.name} hasn't set up their sign-in`,
          message:
            age >= NUDGE_AFTER_DAYS
              ? `Invited ${age} days ago — resend their link`
              : "Send them their invite link to get started",
          link: "/builder/compliance",
        });
      }
    });

    // Compliance lapses, with a 3-day overdue nudge (document-aware statuses).
    workers.forEach((w) => {
      const docs = docsByWorker[w.id] || {};
      const problems = complianceCategories
        .map((c) => ({ label: c.label, status: categoryStatus(w, c.key, docs[c.key]) }))
        .filter((x) => x.status === "Missing" || x.status === "Expired");
      if (!problems.length) return;
      const items = problems.map((p) => `${p.label}${p.status === "Expired" ? " (expired)" : ""}`);
      const age = daysAgo(w.createdAt);
      if (age >= NUDGE_AFTER_DAYS) {
        list.push({
          id: `compliance-overdue-${w.id}`,
          type: "compliance",
          severity: "urgent",
          title: `${w.name} — overdue ${age} days`,
          message: `Still outstanding: ${items.join(", ")}`,
          link: "/builder/compliance",
        });
      } else {
        list.push({
          id: `compliance-pending-${w.id}`,
          type: "compliance",
          severity: "high",
          title: `${w.name} — site access blocked`,
          message: `Outstanding: ${items.join(", ")}`,
          link: "/builder/compliance",
        });
      }
    });

    // Pending SWMS sign-offs.
    templates.forEach((t) => {
      if (t.signed < t.total) {
        list.push({
          id: `swms-${t.id}`,
          type: "swms",
          severity: "medium",
          title: `${t.trade} SWMS ${t.version}`,
          message: `${t.signed}/${t.total} signed — sign-off pending`,
          link: "/builder/swms",
        });
      }
    });

    return list;
  }, [incidents, workers, templates, documents]);

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
      if (user?.id) saveReadNotifications(user.id, [...idSet]).catch(() => {});
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
