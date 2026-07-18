import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

// Shows a printable "scan to sign in" poster with the project's QR code.
// The QR encodes {origin}/checkin/<token>; scanning it opens the site sign-in.
export default function QrPosterModal({ project, org, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);
  const url = project ? `${window.location.origin}/checkin/${project.checkinToken}` : "";

  useEffect(() => {
    if (!project?.checkinToken) return;
    let live = true;
    // qrcode loads on demand — only a builder printing a poster needs it, so
    // it stays out of the app shell a tradie downloads on site.
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: "M" })
      )
      .then((d) => live && setDataUrl(d))
      .catch(() => live && setDataUrl(null));
    return () => { live = false; };
  }, [project?.checkinToken, url]);

  const posterHtml = () =>
    `<!doctype html><html><head><title>Site Sign-in — ${project.name}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;text-align:center;margin:0;padding:48px;color:#1e293b}
        .badge{color:#1e3a8a;font-size:14px;letter-spacing:2px;text-transform:uppercase;font-weight:700}
        h1{font-size:40px;margin:12px 0 4px}
        .addr{color:#475569;font-size:18px;margin-bottom:8px}
        .org{color:#64748b;font-size:16px;margin-bottom:28px}
        img{width:420px;height:420px}
        .cta{font-size:26px;font-weight:700;margin-top:24px}
        .sub{color:#475569;font-size:16px;margin-top:6px}
        .foot{margin-top:36px;color:#94a3b8;font-size:12px}
      </style></head><body>
        <div class="badge">Site Sign-in</div>
        <h1>${project.name}</h1>
        ${project.address ? `<div class="addr">${project.address}</div>` : ""}
        <div class="org">${org?.name || ""}</div>
        <img src="${dataUrl}" alt="Sign-in QR code" />
        <div class="cta">📱 Scan to sign in for the day</div>
        <div class="sub">Point your phone camera at the code before you start work.</div>
        <div class="foot">OHS Builder Victoria · ohsbuildervictoria.com.au</div>
      </body></html>`;

  // Download the QR as a PNG — the guaranteed fallback when printing can't run
  // (pop-up blocked, or a phone with no print path). The builder still gets a
  // file they can print or send to the site.
  const downloadQr = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${project.name.replace(/[^\w -]+/g, "").trim() || "site"} — sign-in QR.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Print via a hidden same-document iframe instead of window.open(). Pop-up
  // blockers silently killed the old window.open path, so "Print poster" did
  // nothing with no error. The iframe needs no pop-up permission; if even that
  // is unavailable, fall back to downloading the QR image.
  const printPoster = () => {
    if (!dataUrl) return;
    let iframe;
    try {
      iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("no iframe document");
      doc.open();
      doc.write(posterHtml());
      doc.close();
      const fire = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          downloadQr();
        }
        setTimeout(() => iframe.remove(), 1000);
      };
      const img = doc.querySelector("img");
      if (img && !img.complete) {
        img.onload = fire;
        img.onerror = () => { iframe.remove(); downloadQr(); };
      } else {
        fire();
      }
    } catch {
      if (iframe) iframe.remove();
      downloadQr();
    }
  };

  return (
    <Modal
      open={!!project}
      onClose={onClose}
      title="Site Sign-in QR"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={downloadQr} disabled={!dataUrl}>Download QR</Button>
          <Button onClick={printPoster} disabled={!dataUrl}>Print poster</Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Site sign-in</p>
        <p className="mt-0.5 text-lg font-bold text-slate-800">{project?.name}</p>
        {project?.address && <p className="text-sm text-slate-500">{project.address}</p>}
        {dataUrl ? (
          <img src={dataUrl} alt="Sign-in QR code" className="my-4 h-56 w-56" />
        ) : (
          <div className="my-4 flex h-56 w-56 items-center justify-center text-sm text-slate-400">
            Generating…
          </div>
        )}
        <p className="text-sm font-medium text-slate-700">📱 Scan to sign in for the day</p>
        <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500">
          {url}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Print this and put it at the site gate. Each tradie scans it once each
          morning; the count feeds your site diary and LTIFR hours.
        </p>
      </div>
    </Modal>
  );
}
