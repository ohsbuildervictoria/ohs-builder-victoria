import { useAuthContext } from "../context/AuthContext";

// The Education block of public.my_permissions(): null for Industry accounts,
// otherwise { role, institutionId, institutionName, logoUrl, primaryColour,
// secondaryColour, sandbox, enrolmentId?, cohortId?, enrolmentStatus?, uiState? }.
export function useEducation() {
  const { user, permissions } = useAuthContext();
  const education = permissions?.education || null;
  return {
    user,
    permissions,
    education,
    isStudent: education?.role === "student",
    isAssessor: education?.role === "assessor",
    isInstitutionAdmin: education?.role === "institution_admin",
    isSandbox: !!permissions?.sandbox,
    ready: permissions !== null && permissions !== undefined,
  };
}
