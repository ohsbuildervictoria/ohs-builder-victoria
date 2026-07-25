import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import {
  uploadProjectDocument,
  deleteProjectDocument,
  getProjectDocUrl,
} from "../lib/api";

// Project files (working drawings, permits, certificates, compliance records).
// Deliberately the same shape as useDocuments/usePhotos — one storage pattern
// across the app: bytes in a private bucket, org-scoped metadata row, signed
// URL to view.
export function useProjectDocs(projectId = null) {
  const { projectDocs, setProjectDocs } = useAppContext();
  const { user } = useAuthContext();
  const userName = user?.name || "";

  const scoped = useMemo(() => {
    if (projectId == null) return projectDocs;
    return projectDocs.filter((d) => d.projectId === Number(projectId));
  }, [projectDocs, projectId]);

  // Uploads a FileList/array, reporting both halves honestly — a partial
  // upload must not be dressed up as a clean one.
  const addDocs = useCallback(
    async (pid, files, category) => {
      let saved = 0;
      const failures = [];
      for (const file of Array.from(files || [])) {
        try {
          const doc = await uploadProjectDocument({
            projectId: Number(pid),
            category,
            file,
            uploadedBy: userName,
          });
          setProjectDocs((prev) => [doc, ...prev]);
          saved += 1;
        } catch (err) {
          failures.push(`${file.name}: ${err.message || "upload failed"}`);
        }
      }
      return { saved, failures };
    },
    [setProjectDocs, userName]
  );

  const removeDoc = useCallback(
    async (doc) => {
      await deleteProjectDocument(doc);
      setProjectDocs((prev) => prev.filter((d) => d.id !== doc.id));
    },
    [setProjectDocs]
  );

  const open = useCallback((doc) => getProjectDocUrl(doc.filePath), []);

  return { docs: scoped, addDocs, removeDoc, open };
}
