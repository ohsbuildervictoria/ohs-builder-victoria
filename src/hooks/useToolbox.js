import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

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
    (meeting) => {
      setMeetings((prev) => {
        const id = prev.reduce((max, m) => Math.max(max, m.id), 0) + 1;
        return [
          { id, attendance: 0, signatures: 0, status: "Scheduled", ...meeting },
          ...prev,
        ];
      });
    },
    [setMeetings]
  );

  // Records (or removes) a digital signature for an attendee on a meeting.
  const recordAttendance = useCallback(
    (id, delta = 1) => {
      setMeetings((prev) =>
        prev.map((m) => {
          if (m.id !== Number(id)) return m;
          const signatures = Math.max(0, m.signatures + delta);
          return { ...m, signatures, status: signatures > 0 ? "Completed" : m.status };
        })
      );
    },
    [setMeetings]
  );

  const getStats = useCallback(() => {
    const total = scoped.length;
    const signatures = scoped.reduce((s, m) => s + m.signatures, 0);
    const withAttendance = scoped.filter((m) => m.attendance > 0);
    const avgAttendance = withAttendance.length
      ? Math.round(
          withAttendance.reduce(
            (s, m) => s + (m.signatures / m.attendance) * 100,
            0
          ) / withAttendance.length
        )
      : 0;
    return { total, signatures, avgAttendance };
  }, [scoped]);

  return { meetings: scoped, addMeeting, recordAttendance, getStats };
}
