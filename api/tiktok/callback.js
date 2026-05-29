import { exchangeCodeForToken, fetchUsername, saveTokens } from '../_lib/tiktok.js'

function parseCookie(header, name) {
  const match = (header || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))
  return match ? match.slice(name.length + 1) : null
}

/**
 * GET /api/tiktok/callback?code=...&state=...
 * OAuth redirect target. Validates state, exchanges the code (with PKCE
 * verifier) for tokens, then persists the refresh token in Supabase.
 */
export default async function handler(req, res) {
  try {
    const { code, state, error: oauthError } = req.query || {}
    if (oauthError) {
      res.status(400).send(`TikTok authorization failed: ${oauthError}`)
      return
    }

    const raw = parseCookie(req.headers.cookie, 'tt_oauth')
    if (!raw) {
      res.status(400).send('Missing OAuth session cookie — restart the flow at /api/tiktok/auth')
      return
    }
    const { verifier, state: savedState } = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))

    if (!code || !state || state !== savedState) {
      res.status(400).send('Invalid OAuth state')
      return
    }

    const token = await exchangeCodeForToken({ code, codeVerifier: verifier })
    const user = await fetchUsername(token.access_token).catch(() => null)
    await saveTokens(token, user?.username)

    // Clear the cookie.
    res.setHeader('Set-Cookie', 'tt_oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
    res
      .status(200)
      .send(
        `Connected TikTok account ${user?.username ? '@' + user.username : token.open_id}. ` +
          `You can close this window. Scopes: ${token.scope}`,
      )
  } catch (err) {
    res.status(500).send(`Callback error: ${err.message}`)
  }
}
