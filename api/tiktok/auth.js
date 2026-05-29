import { AUTHORIZE_URL, INBOX_SCOPES, DIRECT_POST_SCOPES, createPkce, randomState } from '../_lib/tiktok.js'

/**
 * GET /api/tiktok/auth?mode=inbox|direct
 * Starts the TikTok OAuth flow. Stashes the PKCE verifier + state in an
 * httpOnly cookie and redirects the user to TikTok to authorize the account.
 */
export default async function handler(req, res) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = process.env.TIKTOK_REDIRECT_URI
  if (!clientKey || !redirectUri) {
    res.status(500).json({ error: 'Missing TIKTOK_CLIENT_KEY or TIKTOK_REDIRECT_URI' })
    return
  }

  const mode = req.query?.mode === 'direct' ? 'direct' : 'inbox'
  const scope = mode === 'direct' ? DIRECT_POST_SCOPES : INBOX_SCOPES

  const { verifier, challenge } = createPkce()
  const state = randomState()

  // Persist verifier + state for the callback. 10 min, httpOnly, SameSite=Lax.
  const cookie = Buffer.from(JSON.stringify({ verifier, state, mode })).toString('base64url')
  res.setHeader('Set-Cookie', `tt_oauth=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)

  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('client_key', clientKey)
  url.searchParams.set('scope', scope)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')

  res.writeHead(302, { Location: url.toString() })
  res.end()
}
