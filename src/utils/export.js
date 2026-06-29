function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  triggerDownload(filename, lines.join("\n"), "text/csv;charset=utf-8");
}

export function downloadReport(filename, lines) {
  const body = Array.isArray(lines) ? lines.join("\n") : lines;
  triggerDownload(filename, body, "text/plain;charset=utf-8");
}
