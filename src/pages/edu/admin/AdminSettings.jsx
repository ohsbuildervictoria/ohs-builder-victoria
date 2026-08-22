import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Tabs from "../../../components/ui/Tabs";
import { PageHeader, ErrorCard, Loading } from "../../../components/education/EduBits";
import { InstitutionProfileForm, InstitutionBrandingForm } from "../../../components/education/InstitutionForms";
import { fetchInstitutionOverview } from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";
import { eduBrand } from "../../../data/education";

// ============================================================================
// Institution & branding — the same two forms the setup wizard uses.
// ============================================================================

export default function AdminSettings() {
  const { education } = useEducation();
  const [institution, setInstitution] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Profile");
  const instId = education?.institutionId;

  const load = () => { setError(null); fetchInstitutionOverview(instId).then((o) => setInstitution(o.institution)).catch((e) => setError(e.message)); };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!institution) return <Loading label="Loading institution…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/education/admin" }, { label: "Institution & branding" }]}
        title="Institution & branding"
        subtitle="Who you are and how the Education environment looks to your students and assessors."
        action={<Link to="/education/admin/setup" className="text-sm font-medium text-blue-700 hover:underline">Reopen setup wizard →</Link>}
      />
      <Tabs tabs={["Profile", "Branding"]} active={tab} onChange={setTab} />
      {tab === "Profile" && (
        <Card>
          <CardHeader title="Institution profile" subtitle="Shown on Education screens and evidence packs." />
          <CardBody className="pt-2">
            <InstitutionProfileForm key={institution.id} institution={institution} onSaved={(s) => setInstitution((i) => ({ ...i, ...s }))} />
          </CardBody>
        </Card>
      )}
      {tab === "Branding" && (
        <Card>
          <CardHeader title="Branding" subtitle="Logo and colours flow into navigation, the student and assessor environments and evidence pack headers." />
          <CardBody className="pt-2">
            <InstitutionBrandingForm key={`${institution.id}-${institution.logoUrl}`} institution={institution} onSaved={(s) => setInstitution((i) => ({ ...i, ...s }))} />
            <p className="mt-4 text-xs text-slate-500">Colour changes appear for everyone after their next sign-in or page reload. {eduBrand.attribution} is always retained.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
