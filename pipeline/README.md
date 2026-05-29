# Nexxt TikTok pipeline

One command → a posted TikTok. Takes a tool name, builds the video end-to-end, and drops it in the @nexxtsitemanager inbox.

```
cd pipeline
npm install
cp .env.example .env   # fill in credentials
node run.js progress-claim
```

## What it does (4 stages)

1. **Arcads** — reads `walkthrough-nexxt/<tool>.md`, generates an **AI presenter video that speaks the hook + voiceover** (presenter *and* voiceover in one asset — no separate TTS). → `out/<tool>-<ts>/presenter.mp4`
2. **Puppeteer** — records the app screen demo for the tool (`tools.config.js` → route + interaction steps). → `screen.mp4`
3. **ffmpeg** (`ffmpeg-static`, no system install needed) — composes **9:16 1080×1920**: screen recording fills the frame, presenter as a picture-in-picture, presenter audio as soundtrack, **navy/gold captions burned in** from the voiceover. → `final.mp4`
4. **TikTok** — uploads `final.mp4` to the connected account via the **inbox FILE_UPLOAD** flow (no audit, no domain verification) — lands in TikTok drafts to review & publish.

## Usage

```
node run.js <tool> [options]

Tools:  progress-claim, swms, trade-splitter, plan-reader, eot-notice

--mode inbox|direct   Post mode (default inbox; direct needs video.publish + audit)
--no-post             Build the video but don't post (great for first runs)
--presenter <path>    Reuse an existing presenter mp4 (skip Arcads)
--screen <path>       Reuse an existing screen recording (skip Puppeteer)
--mock                ffmpeg placeholders for presenter + screen (no Arcads
                      plan, no running app) — test stitch + captions + post
--dry-run             Parse the script and print the plan only (no API calls, no deps)
```

Recommended first runs (no Arcads plan needed):
```
node run.js progress-claim --dry-run            # verify parsing (no deps)
node run.js progress-claim --mock --no-post     # full stitch+captions with placeholders → out/final.mp4
node run.js progress-claim --mock               # ...and post the placeholder to the TikTok inbox
```

`--mock` swaps the Arcads call (and Puppeteer, if no `--screen`) for ffmpeg-generated
placeholder clips, so you can exercise the **stitch → caption → TikTok inbox** path before
paying for the Arcads Pro plan. Posting still needs the Supabase + TikTok env vars.

## Prerequisites

- **Arcads Pro/custom plan** for API access (`ARCADS_BASIC_AUTH` / `ARCADS_API_KEY`). There is no free tier or sandbox.
- The **app running** and reachable at `APP_BASE_URL` (e.g. `npm run preview` → `http://localhost:4173`).
- A **TikTok account connected** via the `api/tiktok/*` OAuth flow, with its `open_id` in Supabase `tiktok_accounts` (set `TIKTOK_OPEN_ID`).
- Env vars per `.env.example`.

## Known gaps (read before running for real)

- **Progress Claim screen doesn't exist in the app yet.** The live repo app is OH&S Builder; the walkthrough scripts describe Nexxt Site Manager tools that aren't all built. `tools.config.js` currently points the demo at `/dashboard` as a placeholder — **set the real `route` + `steps` once the Progress Claim UI ships**, or the screen recording won't show the actual tool.
- **Arcads endpoint payloads** in `lib/arcads.js` follow the bundled skill docs (`tools/arcads-claude-code/skills/arcads-external-api/reference.md`, on the Arcads PR). Field names are read defensively; verify against that reference if a call returns 4xx.
- **Captions** use naive even-timing across the voiceover. For tight sync, swap `lib/captions.js` for word-level Whisper timing (the Arcads pack's `caption-video` skill has this).
- **Direct (public) posting** isn't implemented here — only inbox. Public posts need `video.publish` + a passed TikTok audit.
- Not yet run end-to-end here (no Arcads plan / TikTok tokens in CI). Each module is syntax-checked and the parser is verified against `01_progress_claim.md`.
