// Where does an account land after sign-in? One answer, used by Login, Signup,
// the invite pages and the layouts, so the three Education roles and the
// Industry roles never fight over the same redirect.
export function homeRouteFor(user, permissions) {
  if (!user) return "/login";
  const edu = permissions?.education;
  if (edu?.role === "institution_admin") return "/education/admin";
  if (edu?.role === "assessor") return "/education/assess";
  if (edu?.role === "student") return "/education/student";
  if (user.role === "worker") return "/worker/home";
  if (user.role === "institution_admin") return "/education/admin";
  if (user.role === "assessor") return "/education/assess";
  return "/builder/dashboard";
}

export const EDU_ROUTES = {
  admin: "/education/admin",
  adminSetup: "/education/admin/setup",
  adminCohort: (id) => `/education/admin/cohorts/${id}`,
  assess: "/education/assess",
  assessCohort: (id) => `/education/assess/cohorts/${id}`,
  assessStudent: (enrolmentId) => `/education/assess/students/${enrolmentId}`,
  student: "/education/student",
  studentTask: (code) => `/education/student/tasks/${code}`,
  studentEvidence: "/education/student/evidence",
  studentSubmit: "/education/student/submit",
  studentResults: "/education/student/results",
  join: (token) => `/edu/join/${token}`,
};
