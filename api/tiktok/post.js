import { getValidAccessToken } from '../_lib/tiktok.js'
import { signVideoPath } from '../_lib/videoToken.js'

const INBOX_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/'
const DIRECT_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/'

/**
 * Public base URL of THIS deployment. Must be a domain you have verified as a
 * URL property in the TikTok developer portal, because PULL_FROM_URL only
 * accepts video URLs on verified domains. Falls back to the request host.
 */
function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

/**
 * POST /api/tiktok/post
 * Body: { openId, objectPath, mode?: 'inbox' | 'direct', title? }
 *
 * - objectPath: path of the video inside the Supabase Storage bucket.
 * - mode 'inbox' (default): no audit needed; lands in the creator's drafts.
 * - mode 'direct': publishes to profile (needs video.publish + audit to be
 *   public; unaudited clients are forced to SELF_ONLY / private).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' })
    return
  }
  try {
    const { openId, objectPath, mode = 'inbox', title = '' } = req.body || {}
    if (!openId || !objectPath) {
      res.status(400).json({ error: 'openId and objectPath are required' })
      return
    }

    const accessToken = await getValidAccessToken(openId)

    // Build a short-lived, signed proxy URL on our (verifiable) domain.
    const { exp, sig } = signVideoPath(objectPath)
    const videoUrl =
      `${publicBaseUrl(req)}/api/tiktok/video` +
      `?path=${encodeURIComponent(objectPath)}&exp=${exp}&sig=${sig}`

    let initUrl
    let payload
    if (mode === 'direct') {
      initUrl = DIRECT_INIT_URL
      payload = {
        post_info: {
          title,
          // Unaudited clients can only post SELF_ONLY. Widen after audit.
          privacy_level: 'SELF_ONLY',
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      }
    } else {
      initUrl = INBOX_INIT_URL
      payload = { source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } }
    }

    const ttRes = await fetch(initUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(payload),
    })
    const json = await ttRes.json()
    if (!ttRes.ok || json?.error?.code !== 'ok') {
      res.status(502).json({ error: 'TikTok publish init failed', detail: json })
      return
    }

    // publish_id can be polled at /v2/post/publish/status/fetch/.
    res.status(200).json({ mode, publish_id: json.data?.publish_id, raw: json })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
