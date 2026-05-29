import { getServiceClient } from '../_lib/supabase.js'
import { verifyVideoPath } from '../_lib/videoToken.js'

const BUCKET = process.env.TIKTOK_VIDEO_BUCKET || 'walkthrough-videos'

/**
 * GET /api/tiktok/video?path=<objectPath>&exp=<unix>&sig=<hmac>
 *
 * Public, signed proxy that streams a video out of Supabase Storage on THIS
 * (TikTok-verified) domain, so it can be used as a PULL_FROM_URL source.
 * The signature + expiry stop it being an open proxy over the bucket.
 */
export default async function handler(req, res) {
  const { path, exp, sig } = req.query || {}
  if (!verifyVideoPath(path, exp, sig)) {
    res.status(403).json({ error: 'Invalid or expired video signature' })
    return
  }

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (error || !data) {
      res.status(404).json({ error: `Object not found: ${path}` })
      return
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    res.setHeader('Content-Type', data.type || 'video/mp4')
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'private, max-age=600')
    res.status(200).end(buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
