// ============================================================================
// Client-side photo compression. Site wifi is slow and phone photos are
// 3–10 MB — resize to a sensible max dimension and re-encode as JPEG before
// upload. If anything about the image can't be processed (odd format, old
// browser), the original file is uploaded rather than failing the attach.
// ============================================================================

const MAX_DIM = 1600;
const QUALITY = 0.8;

export async function compressImage(file, maxDim = MAX_DIM, quality = QUALITY) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    // Already small enough — skip the re-encode.
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
