# TikTok Content Posting integration (scaffold)

Serverless functions that connect a TikTok account and post videos pulled from
Supabase Storage. **Starts in Sandbox + Upload-to-Inbox mode** so you can test
without passing TikTok's audit.

## Endpoints
| Route | Purpose |
|---|---|
| `GET /api/tiktok/auth?mode=inbox\|direct` | Start OAuth (PKCE). `inbox` = `video.upload`, `direct` = `video.publish`. |
| `GET /api/tiktok/callback` | OAuth redirect target. Exchanges the code and stores the refresh token in Supabase. |
| `POST /api/tiktok/post` | Body `{ openId, objectPath, mode?, title? }`. Initiates an inbox (default) or direct post via `PULL_FROM_URL`. |
| `GET /api/tiktok/video` | Signed public proxy that streams a Storage object on the verified domain (the `PULL_FROM_URL` source). |

## Required env vars (Vercel)
```
TIKTOK_CLIENT_KEY            # from the TikTok developer portal app
TIKTOK_CLIENT_SECRET         # server-side only
TIKTOK_REDIRECT_URI          # https://<your-domain>/api/tiktok/callback (registered in the portal)
PUBLIC_BASE_URL              # https://<your-verified-domain> (used to build the PULL_FROM_URL)
TIKTOK_VIDEO_BUCKET          # Supabase Storage bucket name (default: walkthrough-videos)
TIKTOK_VIDEO_SIGNING_SECRET  # optional; defaults to TIKTOK_CLIENT_SECRET
SUPABASE_URL                 # project URL
SUPABASE_SERVICE_ROLE_KEY    # service role (bypasses RLS) — server-side only
```

## Setup
1. Run the migration in `supabase/migrations/0001_tiktok_accounts.sql`.
2. Create a Storage bucket (e.g. `walkthrough-videos`) and upload a test clip.
3. In the TikTok portal: add **Login Kit** + **Content Posting API**, register the redirect URI, and **verify your deployment domain** (required for `PULL_FROM_URL`).
4. Visit `/api/tiktok/auth` while signed into the target account to connect it.
5. `POST /api/tiktok/post` with the `open_id` and the object path → it lands in TikTok drafts (inbox mode).

## Going live (public posts)
- Switch the connect flow to `mode=direct` (`video.publish`) and submit the app for **audit**. Until audited, direct posts are forced to `SELF_ONLY` (private). Inbox mode does not need an audit — you just publish from the TikTok app drafts.

> Note: `video.js` buffers the whole file in memory, which is fine for short
> walkthrough clips. For large files, switch to a ranged/streamed response.
