import { useAuthContext } from "../context/AuthContext";
import { usablePrimary } from "../data/education";

// The Education block of public.my_permissions(): null for Industry accounts,
// otherwise { role, institutionId, institutionName, logoUrl, primaryColour,
// secondaryColour, sandbox, enrolmentId?, cohortId?, enrolmentStatus?, uiState? }.
export function useEducation() {
  const { user, permissions } = useAuthContext();
  const raw = permissions?.education || null;
  // Branding colour is normalised once here so every consumer can put white
  // text on it safely.
  const education = raw ? { ...raw, primaryColour: usablePrimary(raw.primaryColour) } : null;
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
