import path from 'node:path'
import { download, pollUntil, log } from './util.js'

// Arcads external API client. Generates an AI presenter video that SPEAKS the
// supplied script (presenter + voiceover in one asset — no separate TTS).
//
// Endpoint shapes follow tools/arcads-claude-code/skills/arcads-external-api/
// (SKILL.md + reference.md). Field names that the API may tweak are read
// defensively; verify against reference.md if a call 4xxs.

const BASE = (process.env.ARCADS_BASE_URL || 'https://external-api.arcads.ai').replace(/\/$/, '')

function authHeader() {
  if (process.env.ARCADS_BASIC_AUTH) return process.env.ARCADS_BASIC_AUTH
  if (process.env.ARCADS_API_KEY) {
    // API key used as HTTP Basic username with empty password.
    return 'Basic ' + Buffer.from(`${process.env.ARCADS_API_KEY}:`).toString('base64')
  }
  throw new Error('Set ARCADS_BASIC_AUTH or ARCADS_API_KEY (see pipeline/.env.example)')
}

async function api(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`Arcads ${method} ${endpoint} → ${res.status}: ${text.slice(0, 400)}`)
  return json
}

/** Find an existing product by name, or create one for Nexxt Site Manager. */
export async function ensureProduct(name = 'Nexxt Site Manager') {
  const list = await api('GET', '/v1/products')
  const items = Array.isArray(list) ? list : list.products || list.data || []
  const found = items.find((p) => (p.name || '').toLowerCase() === name.toLowerCase())
  if (found) return found.id || found._id
  const created = await api('POST', '/v1/products', {
    name,
    description: 'AI-powered construction document tools for Victorian builders.',
    targetAudience: 'Victorian site supervisors and builders',
    mainFeatures: 'Progress claims, SWMS, variations, plan reading',
    painPoint: 'Paperwork eats builders’ nights',
  })
  return created.id || created._id || created.productId
}

/**
 * Generate the presenter video.
 * @returns {Promise<string>} local path to the downloaded MP4.
 */
export async function generatePresenter({ productId, spokenScript, outDir }) {
  log('arcads', 'creating script…')
  const script = await api('POST', '/v1/scripts', {
    productId,
    text: spokenScript,
    ...(process.env.ARCADS_ACTOR_ID ? { actorId: process.env.ARCADS_ACTOR_ID } : {}),
    ...(process.env.ARCADS_VOICE_ID ? { voiceId: process.env.ARCADS_VOICE_ID } : {}),
  })
  const scriptId = script.id || script._id || script.scriptId
  if (!scriptId) throw new Error(`No script id in Arcads response: ${JSON.stringify(script).slice(0, 200)}`)

  log('arcads', `generating presenter video for script ${scriptId}…`)
  const gen = await api('POST', `/v1/scripts/${scriptId}/generate`, {})
  const assetId = gen.assetId || gen.id || gen.videoId || (gen.assets && gen.assets[0]?.id)
  if (!assetId) throw new Error(`No asset id in generate response: ${JSON.stringify(gen).slice(0, 200)}`)

  log('arcads', `polling asset ${assetId} (this can take a few minutes)…`)
  const asset = await pollUntil(
    () => api('GET', `/v1/assets/${assetId}`),
    (a) => ['generated', 'completed', 'ready', 'failed'].includes((a.status || '').toLowerCase()),
    { intervalMs: 8000, timeoutMs: 900000, label: 'Arcads presenter' },
  )
  if ((asset.status || '').toLowerCase() === 'failed') throw new Error('Arcads generation failed')

  const url = asset.url || asset.videoUrl || asset.downloadUrl
  if (!url) throw new Error(`No video URL on finished asset: ${JSON.stringify(asset).slice(0, 200)}`)

  const dest = path.join(outDir, 'presenter.mp4')
  await download(url, dest)
  return dest
}
