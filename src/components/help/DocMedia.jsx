import { useEffect, useState } from "react";

// ============================================================================
// Documentation media slots — annotated screenshots and silent screen
// recordings.
//
// Assets live under public/docs/screenshots/ and public/docs/videos/ and are
// referenced from the guide data files. A missing asset can't be detected via
// <img>/<video> onError alone: the SPA rewrite answers any path with
// index.html and a 200, so the element just hangs. Instead we HEAD the asset
// and check the content-type — text/html means "the rewrite answered", i.e.
// the capture hasn't been added yet, and the slot renders its teaching
// fallback (callouts / storyboard) instead.
// ============================================================================

function useAssetAvailable(src, contentTypePrefix) {
  const [state, setState] = useState("checking"); // checking | ok | missing
  useEffect(() => {
    let alive = true;
    fetch(src, { method: "HEAD" })
      .then((res) => {
        const type = res.headers.get("content-type") || "";
        const ok = res.ok && type.startsWith(contentTypePrefix);
        if (alive) setState(ok ? "ok" : "missing");
      })
      .catch(() => {
        if (alive) setState("missing");
      });
    return () => {
      alive = false;
    };
  }, [src, contentTypePrefix]);
  return state;
}

// Numbered callout legend shared by both the live screenshot and its fallback.
function Callouts({ callouts, dark }) {
  if (!callouts?.length) return null;
  return (
    <ol className="mt-3 space-y-1.5">
      {callouts.map((c, i) => (
        <li key={c} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-[11px] font-extrabold text-blue-950">
            {i + 1}
          </span>
          <span className={dark ? "text-slate-300" : "text-slate-600"}>{c}</span>
        </li>
      ))}
    </ol>
  );
}

export function DocScreenshot({ shot, dark = false }) {
  const available = useAssetAvailable(shot?.src ?? "", "image/");
  if (!shot) return null;

  const frame = dark
    ? "rounded-xl border border-slate-700 bg-slate-950/40"
    : "rounded-xl border border-slate-200 bg-slate-50";

  return (
    <figure className="mt-4">
      {available === "ok" ? (
        <div className={`overflow-hidden ${frame}`}>
          <img src={shot.src} alt={shot.alt} loading="lazy" className="w-full object-contain" />
        </div>
      ) : (
        <div className={`p-4 ${frame}`}>
          <p className={`text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
            🖼️ {shot.alt}
          </p>
          <p className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Where to look on this screen:
          </p>
        </div>
      )}
      <figcaption>
        <Callouts callouts={shot.callouts} dark={dark} />
      </figcaption>
    </figure>
  );
}

export function DocVideo({ video, dark = false }) {
  const available = useAssetAvailable(video?.src ?? "", "video/");
  if (!video) return null;

  const frame = dark
    ? "rounded-xl border border-slate-700 bg-slate-950/40"
    : "rounded-xl border border-slate-200 bg-slate-50";

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
          🎬 {video.title}
        </p>
        <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {video.duration} · silent, text overlays
        </span>
      </div>
      {available === "ok" ? (
        <video
          controls
          muted
          playsInline
          preload="metadata"
          className={`mt-2 w-full overflow-hidden ${frame}`}
          src={video.src}
        />
      ) : (
        // Recording not captured yet — show the storyboard the video follows,
        // so the slot still walks the reader through the same four beats.
        <ol className={`mt-2 grid gap-2 p-4 sm:grid-cols-2 ${frame}`}>
          {[
            ["1. Purpose", video.beats?.[0]],
            ["2. How to use it", video.beats?.[1]],
            ["3. Records created", video.beats?.[2]],
            ["4. What you get", video.beats?.[3]],
          ].map(([label, text]) =>
            text ? (
              <li key={label}>
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-500">
                  {label}
                </p>
                <p className={`mt-0.5 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                  {text}
                </p>
              </li>
            ) : null
          )}
        </ol>
      )}
    </div>
  );
}
