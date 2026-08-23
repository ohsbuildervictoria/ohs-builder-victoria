import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertToolboxMeeting,
  recordToolboxAttendanceRpc,
  fetchToolboxAttendance,
  completeToolboxMeetingRpc,
} from "../lib/api";

// Where a meeting is in its life, from facts: the status the database holds
// (Completed is set by the server when the whole roster signs after the
// meeting time, or by an explicit audited close-out) and, before that,
// whether the meeting time has passed. The denominator is always the live
// site roster — never the number ticked when the meeting was scheduled.
// Local calendar date as YYYY-MM-DD (never UTC — a 7am Melbourne meeting is
// "today" even though UTC midnight hasn't arrived).
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const meetingHeld = (dateStr) => String(dateStr || "").slice(0, 10) <= localToday();

export function meetingState(m, rosterCount) {
  const expected = Math.max(rosterCount || 0, 0);
  if (m.status === "Completed") {
    return { label: "Completed", expected, detail: m.signatures != null ? `${m.signatures} signed` : "" };
  }
  const held = meetingHeld(m.date);
  if (!held) return { label: "Scheduled", expected, detail: "" };
  if (expected === 0) return { label: "Awaiting Signatures", expected, detail: "no crew on this site yet" };
  return { label: "Awaiting Signatures", expected, detail: `${Math.min(m.signatures || 0, expected)} of ${expected} signed` };
}

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

  // Explicit close-out (server validates: held, at least one signature, a
  // note when the roster is not fully signed; audited).
  const completeMeeting = useCallback(
    async (meetingId, note) => {
      const res = await completeToolboxMeetingRpc(meetingId, note);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === Number(meetingId)
            ? { ...m, status: "Completed", completedAt: new Date().toISOString(), completionNote: note || m.completionNote, signatures: res?.signatures ?? m.signatures }
            : m
        )
      );
      return res;
    },
    [setMeetings]
  );

  const getStats = useCallback(() => {
    const total = scoped.length;
    const signatures = scoped.reduce((s, m) => s + (m.signatures || 0), 0);
    // Sign-off rate over meetings that have been held, against the expected
    // attendance the database now keeps in step with the roster (attendees is
    // raised to the roster/signature count by record_toolbox_attendance).
    const held = scoped.filter((m) => meetingHeld(m.date) && (m.attendees || 0) > 0);
    const avgAttendance = held.length
      ? Math.round(held.reduce((s, m) => s + (Math.min(m.signatures || 0, m.attendees) / m.attendees) * 100, 0) / held.length)
      : 0;
    return { total, signatures, avgAttendance };
  }, [scoped]);

  return { meetings: scoped, addMeeting, signFor, loadAttendance, getStats, completeMeeting, meetingState };
}
