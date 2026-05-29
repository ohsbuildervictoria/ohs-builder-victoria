#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { resolveTool } from './tools.config.js'
import { parseScript } from './lib/parseScript.js'
import { ensureProduct, generatePresenter } from './lib/arcads.js'
import { recordScreen } from './lib/record.js'
import { makePlaceholderPresenter, makePlaceholderScreen } from './lib/mockMedia.js'
import { stitch } from './lib/stitch.js'
import { postToInbox } from './lib/tiktok.js'
import { runQualityGate } from './lib/qualityGate.js'
import { CAPTION_FONT_SIZE } from './lib/captions.js'
import { buildSchedule, printSchedule } from './lib/schedule.js'
import { allVideoKeys } from './tools.config.js'
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

if (flag('help') || (!toolKey && !flag('schedule'))) {
  console.log(`
Nexxt TikTok pipeline — one command from script to posted TikTok.

  node run.js <tool> [options]
  node run.js --schedule          Print the 2-week posting schedule for all videos

Tools: progress-claim, swms, trade-splitter, plan-reader, eot-notice

Options:
  --mode inbox|direct   Post mode (default: inbox; direct needs video.publish + audit)
  --no-post             Build the video but don't post to TikTok
  --no-gate             Skip the pre-post quality gate (not recommended)
  --presenter <path>    Reuse an existing presenter mp4 (skip Arcads)
  --screen <path>       Reuse an existing screen recording (skip Puppeteer)
  --mock                Generate placeholder presenter + screen with ffmpeg
                        (no Arcads plan / no running app) to test stitch +
                        captions + TikTok inbox. Combine with --no-post.
  --dry-run             Parse the script and print the plan only
`)
  process.exit(toolKey || flag('schedule') ? 0 : 1)
}

// ── --schedule: print the 2-week plan for all 15 videos and exit ────────────
if (flag('schedule')) {
  const schedule = buildSchedule(allVideoKeys())
  printSchedule(schedule)
  console.log(`\n(${schedule.length} videos, AEST 6:30am / 7:30pm slots, ≥4h apart)`)
  process.exit(0)
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
  const mock = flag('mock')
  if (mock) warn('--mock: using ffmpeg placeholders (no Arcads, no app)')

  // 1. Presenter (Arcads) — generates video + voiceover from the script.
  let presenter = opt('presenter')
  if (presenter) {
    warn(`reusing presenter ${presenter}`)
  } else if (mock) {
    presenter = await makePlaceholderPresenter({ outDir, words: script.spokenScript.split(/\s+/).length })
    ok(`presenter (placeholder) → ${presenter}`)
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
  } else if (mock) {
    screen = await makePlaceholderScreen({ outDir })
    ok(`screen (placeholder) → ${screen}`)
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

  // 3b. Quality gate — fail closed before any post.
  if (!flag('no-gate')) {
    log('gate', 'running quality checks…')
    const { pass, checks } = await runQualityGate(final, { captionFontSize: CAPTION_FONT_SIZE })
    for (const c of checks) {
      process.stdout.write(`   ${c.pass ? '✓' : '✗'} ${c.name.padEnd(22)} ${c.detail}\n`)
    }
    if (!pass) {
      throw new Error('Quality gate FAILED — not posting. Fix the ✗ checks above (or re-run with --no-gate to override).')
    }
    ok('quality gate passed')
  } else {
    warn('--no-gate: quality checks skipped')
  }

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
    ok(`posted to @nexxtsitemanager inbox (publish_id ${publishId}, status ${status})`)
    console.log(`\n✅ Done. Open TikTok → drafts/inbox to review & publish.`)
  }
} catch (err) {
  console.error(`\n❌ ${err.message}`)
  process.exit(1)
}
