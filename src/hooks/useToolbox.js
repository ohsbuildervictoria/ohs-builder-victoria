import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { insertToolboxMeeting, updateMeetingSignatures } from "../lib/api";

// { meetings, addMeeting, recordAttendance, getStats }
export function useToolbox(projectId = null) {
  const { meetings, setMeetings } = useAppContext();

  const scoped = useMemo(
    () =>
      projectId == null
        ? meetings
        : meetings.filter((m) => m.project === Number(projectId)),
    [meetings, projectId]
  );

  const addMeeting = useCallback(
    async (meeting) => {
      const created = await insertToolboxMeeting(meeting);
      setMeetings((prev) => [created, ...prev]);
      return created;
    },
    [setMeetings]
  );

  // Records (or removes) a digital signature for an attendee on a meeting.
  const recordAttendance = useCallback(
    async (id, delta = 1) => {
      const current = meetings.find((m) => m.id === Number(id));
      if (!current) return;
      const signatures = Math.max(0, current.signatures + delta);
      await updateMeetingSignatures(Number(id), signatures);
      setMeetings((prev) =>
        prev.map((m) => (m.id === Number(id) ? { ...m, signatures } : m))
      );
    },
    [meetings, setMeetings]
  );

  const getStats = useCallback(() => {
    const total = scoped.length;
    const signatures = scoped.reduce((s, m) => s + m.signatures, 0);
    const withAttendance = scoped.filter((m) => m.attendees > 0);
    const avgAttendance = withAttendance.length
      ? Math.round(
          withAttendance.reduce(
            (s, m) => s + (Math.min(m.signatures, m.attendees) / m.attendees) * 100,
            0
          ) / withAttendance.length
        )
      : 0;
    return { total, signatures, avgAttendance };
  }, [scoped]);

  return { meetings: scoped, addMeeting, recordAttendance, getStats };
}
