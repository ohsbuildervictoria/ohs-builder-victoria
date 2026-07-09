import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { compressImage } from "../lib/photos";
import {
  uploadRecordPhoto,
  deleteRecordPhoto,
  getPhotoUrl,
  setDiaryPhotoCount,
} from "../lib/api";

// Photo evidence on diary entries and incidents. Photos are compressed
// client-side before upload (site wifi is slow), stored in the private
// site-photos bucket, org-scoped by RLS like every other record.
export function usePhotos() {
  const { photos, setPhotos } = useAppContext();
  const { user } = useAuthContext();
  const userName = user?.name || "";

  const byEntity = useMemo(() => {
    const map = {};
    for (const p of photos) {
      (map[`${p.entity}:${p.entityId}`] ||= []).push(p);
    }
    return map;
  }, [photos]);

  const photosFor = useCallback(
    (entity, entityId) => byEntity[`${entity}:${Number(entityId)}`] || [],
    [byEntity]
  );

  // Uploads a FileList/array. Returns { saved, failed } — callers report both
  // honestly rather than pretending a partial upload fully worked.
  const addPhotos = useCallback(
    async (entity, entityId, files) => {
      let saved = 0;
      let failed = 0;
      for (const file of Array.from(files || [])) {
        try {
          const blob = await compressImage(file);
          const photo = await uploadRecordPhoto({
            entity,
            entityId: Number(entityId),
            blob,
            fileName: file.name,
            uploadedBy: userName,
          });
          setPhotos((prev) => [...prev, photo]);
          saved++;
        } catch {
          failed++;
        }
      }
      if (entity === "diary_entry" && saved) {
        const total = (byEntity[`diary_entry:${Number(entityId)}`]?.length || 0) + saved;
        setDiaryPhotoCount(Number(entityId), total).catch(() => {});
      }
      return { saved, failed };
    },
    [setPhotos, userName, byEntity]
  );

  const removePhoto = useCallback(
    async (photo) => {
      await deleteRecordPhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    },
    [setPhotos]
  );

  const open = useCallback((photo) => getPhotoUrl(photo.filePath), []);

  return { photos, photosFor, addPhotos, removePhoto, open };
}
