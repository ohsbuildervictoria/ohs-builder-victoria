import { useState, useRef, useEffect, useMemo } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { usePhotos } from "../../hooks/usePhotos";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../ui/Notification";

// ============================================================================
// Photo evidence UI, shared by Site Diary and Incidents.
//
// <PhotoPicker/>  — form control: camera/gallery input (capture-friendly,
//                   large tap target), local thumbnails, remove-before-save.
//                   Parent owns the files; upload happens after the record
//                   is created so photos always attach to a real id.
// <PhotoStrip/>   — "📷 N photos" badge on a saved record; opens a viewer
//                   with signed URLs; builder staff can remove a photo.
// ============================================================================

export function PhotoPicker({ files, onChange, disabled }) {
  const inputRef = useRef(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          onChange([...files, ...Array.from(e.target.files || [])]);
          e.target.value = ""; // same photo can be re-picked after removal
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        📷 Add photos
      </Button>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative">
              <img
                src={previews[i]}
                alt={f.name}
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PhotoStrip({ entity, entityId }) {
  const { photosFor, open, removePhoto } = usePhotos();
  const { isBuilder } = useAuth();
  const toast = useToast();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [urls, setUrls] = useState({}); // photo id -> signed url

  const list = photosFor(entity, entityId);
  if (!list.length) return null;

  const openViewer = async () => {
    setViewerOpen(true);
    for (const p of list) {
      open(p)
        .then((u) => setUrls((prev) => ({ ...prev, [p.id]: u })))
        .catch(() => {});
    }
  };

  const onRemove = async (p) => {
    try {
      await removePhoto(p);
      toast("Photo removed");
    } catch (err) {
      toast(err.message || "Could not remove photo", "error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        className="mt-1 text-xs font-medium text-blue-700 hover:underline"
      >
        📷 {list.length} photo{list.length === 1 ? "" : "s"}
      </button>
      <Modal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title={`Photos (${list.length})`}
        footer={<Button variant="secondary" onClick={() => setViewerOpen(false)}>Close</Button>}
      >
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <div key={p.id} className="space-y-1">
              {urls[p.id] ? (
                <a href={urls[p.id]} target="_blank" rel="noreferrer">
                  <img
                    src={urls[p.id]}
                    alt={p.fileName}
                    className="h-40 w-full rounded-lg border border-slate-200 object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  Loading…
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">{p.uploadedBy || p.fileName}</span>
                {isBuilder && (
                  <button
                    type="button"
                    onClick={() => onRemove(p)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
