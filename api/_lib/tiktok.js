import crypto from 'node:crypto'
import { getServiceClient } from './supabase.js'

// --- TikTok OAuth v2 endpoints ---------------------------------------------
export const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'

// Inbox upload (no audit, lands in the creator's TikTok drafts) needs
// video.upload. Direct Post (publishes to profile) needs video.publish.
// Start in inbox mode for testing; switch SCOPES when you go to direct post.
export const INBOX_SCOPES = 'user.info.basic,video.upload'
export const DIRECT_POST_SCOPES = 'user.info.basic,video.publish'

// --- PKCE helpers ----------------------------------------------------------
function base64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function createPkce() {
  const verifier = base64url(crypto.randomBytes(32))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function randomState() {
  return base64url(crypto.randomBytes(16))
}

// --- Token exchange / refresh ----------------------------------------------
function requireClientCreds() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) {
    throw new Error('Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET env vars')
  }
  return { clientKey, clientSecret }
}

async function postToken(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(`TikTok token endpoint error: ${JSON.stringify(json)}`)
  }
  return json // { access_token, expires_in, refresh_token, refresh_expires_in, open_id, scope, token_type }
}

export async function exchangeCodeForToken({ code, codeVerifier }) {
  const { clientKey, clientSecret } = requireClientCreds()
  return postToken({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    code_verifier: codeVerifier,
  })
}

export async function refreshAccessToken(refreshToken) {
  const { clientKey, clientSecret } = requireClientCreds()
  return postToken({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function fetchUsername(accessToken) {
  const url = `${USER_INFO_URL}?fields=open_id,username,display_name`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await res.json()
  return json?.data?.user ?? null
}

// --- Token persistence (Supabase) ------------------------------------------
function expiryFromNow(seconds) {
  if (!seconds) return null
  return new Date(Date.now() + seconds * 1000).toISOString()
}

export async function saveTokens(token, username) {
  const supabase = getServiceClient()
  const row = {
    open_id: token.open_id,
    username: username ?? null,
    scope: token.scope ?? null,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    access_token_expires_at: expiryFromNow(token.expires_in),
    refresh_token_expires_at: expiryFromNow(token.refresh_expires_in),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('tiktok_accounts').upsert(row, { onConflict: 'open_id' })
  if (error) throw new Error(`Failed to save TikTok tokens: ${error.message}`)
  return row
}

/**
 * Returns a valid access token for an open_id, refreshing + persisting if the
 * stored one has expired (or is within a 60s safety window).
 */
export async function getValidAccessToken(openId) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('tiktok_accounts')
    .select('*')
    .eq('open_id', openId)
    .single()
  if (error || !data) throw new Error(`No stored TikTok account for open_id ${openId}`)

  const expiresAt = data.access_token_expires_at ? Date.parse(data.access_token_expires_at) : 0
  if (expiresAt - Date.now() > 60_000) {
    return data.access_token
  }

  const refreshed = await refreshAccessToken(data.refresh_token)
  await saveTokens(refreshed, data.username)
  return refreshed.access_token
}
