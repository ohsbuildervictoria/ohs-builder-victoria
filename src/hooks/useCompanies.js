import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertCompany,
  updateCompanyRow,
  deleteCompanyRow,
  uploadCompanyDocApi,
  deleteCompanyDocApi,
  getDocUrl,
} from "../lib/api";

// Subcontractor companies + their insurance certificates.
// Certificate mutations call refresh() because the company's public liability
// doc is mirrored into each crew member's Insurance slot at fetch time
// (src/lib/api.js) — a refetch keeps every view on the same truth.
export function useCompanies() {
  const { companies, setCompanies, companyDocs, workers, refresh } = useAppContext();

  // { publicLiability: doc|undefined, workcover: doc|undefined }
  const docsByCompany = useMemo(() => {
    const map = {};
    for (const d of companyDocs) {
      (map[d.companyId] ||= {})[d.category] = d;
    }
    return map;
  }, [companyDocs]);

  const docsFor = useCallback(
    (companyId) => docsByCompany[Number(companyId)] || {},
    [docsByCompany]
  );

  const getCompany = useCallback(
    (id) => companies.find((c) => c.id === Number(id)) || null,
    [companies]
  );

  const workersOf = useCallback(
    (companyId) => workers.filter((w) => w.companyId === Number(companyId)),
    [workers]
  );

  const addCompany = useCallback(
    async (company) => {
      const created = await insertCompany(company);
      setCompanies((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      return created;
    },
    [setCompanies]
  );

  const updateCompany = useCallback(
    async (id, patch) => {
      const saved = await updateCompanyRow(id, patch);
      setCompanies((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      // Workers display the company name (synced employer text) — refetch so
      // a rename shows everywhere.
      if (patch.name !== undefined) await refresh();
      return saved;
    },
    [setCompanies, refresh]
  );

  const removeCompany = useCallback(
    async (company) => {
      const docs = Object.values(docsFor(company.id));
      await deleteCompanyRow(company.id, docs);
      await refresh(); // workers unlink + their insurance reverts to personal
    },
    [docsFor, refresh]
  );

  const uploadDoc = useCallback(
    async ({ companyId, category, file, expiry }) => {
      const saved = await uploadCompanyDocApi({ companyId, category, file, expiry });
      await refresh();
      return saved;
    },
    [refresh]
  );

  const removeDoc = useCallback(
    async (doc) => {
      await deleteCompanyDocApi(doc);
      await refresh();
    },
    [refresh]
  );

  const open = useCallback((doc) => getDocUrl(doc.filePath), []);

  return {
    companies,
    getCompany,
    docsFor,
    workersOf,
    addCompany,
    updateCompany,
    removeCompany,
    uploadDoc,
    removeDoc,
    open,
  };
}
