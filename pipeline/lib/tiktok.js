import fs from 'node:fs'
import { getValidAccessToken } from '../../api/_lib/tiktok.js'
import { pollUntil, log } from './util.js'

const INBOX_INIT = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/'
const STATUS_FETCH = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/'

/**
 * Post a local MP4 to TikTok using the inbox FILE_UPLOAD flow (no audit, no
 * domain verification needed — the video lands in the creator's drafts to
 * publish from the app). Single-chunk upload; fine for short walkthroughs.
 *
 * @returns {Promise<{publishId: string}>}
 */
export async function postToInbox(filePath, openId) {
  const accessToken = await getValidAccessToken(openId)
  const size = fs.statSync(filePath).size

  log('tiktok', `init inbox upload (${(size / 1e6).toFixed(1)} MB)…`)
  const initRes = await fetch(INBOX_INIT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  })
  const initJson = await initRes.json()
  if (!initRes.ok || initJson?.error?.code !== 'ok') {
    throw new Error(`TikTok init failed: ${JSON.stringify(initJson)}`)
  }
  const { publish_id: publishId, upload_url: uploadUrl } = initJson.data

  log('tiktok', 'uploading video bytes…')
  const buffer = fs.readFileSync(filePath)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(size),
      'Content-Range': `bytes 0-${size - 1}/${size}`,
    },
    body: buffer,
  })
  if (!putRes.ok) throw new Error(`TikTok upload PUT failed: ${putRes.status}`)

  // Poll until the upload is processed (lands in inbox/drafts).
  log('tiktok', `polling publish status for ${publishId}…`)
  const status = await pollUntil(
    async () => {
      const r = await fetch(STATUS_FETCH, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ publish_id: publishId }),
      })
      return r.json()
    },
    (j) => ['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE', 'FAILED'].includes(j?.data?.status),
    { intervalMs: 5000, timeoutMs: 300000, label: 'TikTok inbox' },
  )
  if (status?.data?.status === 'FAILED') {
    throw new Error(`TikTok publish failed: ${JSON.stringify(status.data)}`)
  }
  return { publishId, status: status?.data?.status }
}
