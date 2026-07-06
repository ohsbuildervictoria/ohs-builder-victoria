import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { indexDocuments } from "../lib/compliance";
import {
  uploadComplianceDoc,
  deleteComplianceDoc,
  updateDocExpiry,
  getDocUrl,
} from "../lib/api";

// Compliance evidence documents. The builder matrix and the tradie Documents
// tab both go through here, so both read (and mutate) the exact same records.
export function useDocuments() {
  const { documents, setDocuments } = useAppContext();

  const byWorker = useMemo(() => indexDocuments(documents), [documents]);

  const docsFor = useCallback(
    (workerId) => byWorker[Number(workerId)] || {},
    [byWorker]
  );

  const upload = useCallback(
    async (workerId, category, file, expiry) => {
      const saved = await uploadComplianceDoc({
        workerId: Number(workerId),
        category,
        file,
        expiry,
      });
      setDocuments((prev) => {
        const rest = prev.filter(
          (d) => !(d.workerId === saved.workerId && d.category === saved.category)
        );
        return [...rest, saved];
      });
      return saved;
    },
    [setDocuments]
  );

  const setExpiry = useCallback(
    async (doc, expiry) => {
      const saved = await updateDocExpiry(doc.id, expiry);
      setDocuments((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
      return saved;
    },
    [setDocuments]
  );

  const remove = useCallback(
    async (doc) => {
      await deleteComplianceDoc(doc);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    },
    [setDocuments]
  );

  const open = useCallback((doc) => getDocUrl(doc.filePath), []);

  return { documents, byWorker, docsFor, upload, setExpiry, remove, open };
}
