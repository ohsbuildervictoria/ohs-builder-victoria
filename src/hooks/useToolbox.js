import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertToolboxMeeting,
  recordToolboxAttendanceRpc,
  fetchToolboxAttendance,
} from "../lib/api";

// { meetings, addMeeting, signFor, loadAttendance, getStats }
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

  // Records that a NAMED person was at the meeting.
  //
  // This used to be a counter: "+ Sign" added one to an integer, and anyone
  // could press it repeatedly. A number cannot answer the only question
  // consultation evidence exists to answer — was this person at the talk
  // where that hazard was covered? Attendance is now a row per person, and
  // the count on the meeting is derived from it by the database.
  const signFor = useCallback(
    async (meetingId, workerId, signedName) => {
      const result = await recordToolboxAttendanceRpc(
        Number(meetingId),
        Number(workerId),
        signedName
      );
      const roll = await fetchToolboxAttendance(Number(meetingId));
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === Number(meetingId) ? { ...m, signatures: roll.length } : m
        )
      );
      return { result, roll };
    },
    [setMeetings]
  );

  const loadAttendance = useCallback(
    (meetingId) => fetchToolboxAttendance(Number(meetingId)),
    []
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

  return { meetings: scoped, addMeeting, signFor, loadAttendance, getStats };
}
