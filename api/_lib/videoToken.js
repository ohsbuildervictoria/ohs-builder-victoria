import crypto from 'node:crypto'

/**
 * The video proxy (api/tiktok/video.js) must be publicly reachable so TikTok
 * can PULL_FROM_URL, but we don't want it to be an open proxy over the bucket.
 * We sign the storage path with an HMAC + short expiry. TikTok only needs read
 * access for a few minutes while it pulls the file.
 */
function secret() {
  const s = process.env.TIKTOK_VIDEO_SIGNING_SECRET || process.env.TIKTOK_CLIENT_SECRET
  if (!s) throw new Error('Missing TIKTOK_VIDEO_SIGNING_SECRET / TIKTOK_CLIENT_SECRET')
  return s
}

export function signVideoPath(path, ttlSeconds = 600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const sig = crypto.createHmac('sha256', secret()).update(`${path}:${exp}`).digest('hex')
  return { exp, sig }
}

export function verifyVideoPath(path, exp, sig) {
  if (!path || !exp || !sig) return false
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false
  const expected = crypto.createHmac('sha256', secret()).update(`${path}:${exp}`).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}
