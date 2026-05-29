#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { resolveTool } from './tools.config.js'
import { parseScript } from './lib/parseScript.js'
import { ensureProduct, generatePresenter } from './lib/arcads.js'
import { recordScreen } from './lib/record.js'
import { stitch } from './lib/stitch.js'
import { postToInbox } from './lib/tiktok.js'
import { ensureDir, log, ok, warn, requireEnv } from './lib/util.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(HERE, '.env') })

// ── args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const toolKey = argv.find((a) => !a.startsWith('-'))
const flag = (name) => argv.includes(`--${name}`)
const opt = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

if (!toolKey || flag('help')) {
  console.log(`
Nexxt TikTok pipeline — one command from script to posted TikTok.

  node run.js <tool> [options]

Tools: progress-claim, swms, trade-splitter, plan-reader, eot-notice

Options:
  --mode inbox|direct   Post mode (default: inbox; direct needs video.publish + audit)
  --no-post             Build the video but don't post to TikTok
  --presenter <path>    Reuse an existing presenter mp4 (skip Arcads)
  --screen <path>       Reuse an existing screen recording (skip Puppeteer)
  --dry-run             Parse the script and print the plan only
`)
  process.exit(toolKey ? 0 : 1)
}

const tool = resolveTool(toolKey)
const script = parseScript(tool.script)
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outDir = ensureDir(path.join(HERE, 'out', `${toolKey}-${stamp}`))

console.log(`\n🎬 ${toolKey} → ${outDir}`)
log('script', `hook: ${script.hook || '(none)'}`)
log('script', `spoken length: ${script.spokenScript.split(' ').length} words`)

if (flag('dry-run')) {
  console.log('\n--- DRY RUN ---')
  console.log(JSON.stringify({ tool: toolKey, ...script, route: tool.route, steps: tool.steps }, null, 2))
  process.exit(0)
}

try {
  // 1. Presenter (Arcads) — generates video + voiceover from the script.
  let presenter = opt('presenter')
  if (presenter) {
    warn(`reusing presenter ${presenter}`)
  } else {
    requireEnv('ARCADS_BASE_URL')
    const productId = await ensureProduct()
    presenter = await generatePresenter({ productId, spokenScript: script.spokenScript, outDir })
    ok(`presenter → ${presenter}`)
  }

  // 2. Screen recording (Puppeteer).
  let screen = opt('screen')
  if (screen) {
    warn(`reusing screen recording ${screen}`)
  } else {
    screen = await recordScreen({
      route: tool.route,
      steps: tool.steps,
      outDir,
      baseUrl: process.env.APP_BASE_URL || 'http://localhost:4173',
    })
    ok(`screen → ${screen}`)
  }

  // 3. Captions + stitch (ffmpeg) → 9:16. stitch probes the presenter length
  // and writes correctly-timed captions itself.
  const final = await stitch({ presenter, screen, spokenText: script.spokenScript, outDir })
  ok(`final → ${final}`)

  // 4. Post to TikTok.
  if (flag('no-post')) {
    warn('--no-post set; skipping TikTok upload')
    console.log(`\n✅ Done (not posted). Video: ${final}`)
  } else {
    requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TIKTOK_OPEN_ID', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET')
    const mode = opt('mode') || 'inbox'
    if (mode !== 'inbox') {
      throw new Error('Only inbox mode is implemented in this scaffold (no audit needed). Use --no-post + manual review for direct posting until the app passes TikTok audit.')
    }
    const { publishId, status } = await postToInbox(final, process.env.TIKTOK_OPEN_ID)
    ok(`posted to @nextgenhustle365 inbox (publish_id ${publishId}, status ${status})`)
    console.log(`\n✅ Done. Open TikTok → drafts/inbox to review & publish.`)
  }
} catch (err) {
  console.error(`\n❌ ${err.message}`)
  process.exit(1)
}
