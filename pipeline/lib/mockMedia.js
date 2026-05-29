import { spawn } from 'node:child_process'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { log } from './util.js'

// Generates placeholder clips with ffmpeg so the stitch + caption + TikTok
// inbox flow can be exercised WITHOUT an Arcads Pro plan or a running app.
// Plain colour sources (no drawtext) to avoid any font dependency.

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d.toString() })
    p.on('error', reject)
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg (mock) exited ${code}:\n${err.slice(-500)}`))))
  })
}

// Presenter stand-in: navy clip (#0F1B2E) with a tone, length ≈ spoken words.
export async function makePlaceholderPresenter({ outDir, words = 80 }) {
  const dur = Math.min(60, Math.max(8, Math.round(words / 2.5)))
  const out = path.join(outDir, 'presenter.mp4')
  log('mock', `placeholder presenter (${dur}s, no Arcads)`)
  await run([
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x0F1B2E:s=720x1280:r=30:d=${dur}`,
    '-f', 'lavfi', '-i', `sine=frequency=180:duration=${dur}`,
    '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k',
    out,
  ])
  return out
}

// Screen stand-in: teal clip (no audio) sized 9:16.
export async function makePlaceholderScreen({ outDir, durationSec = 20 }) {
  const out = path.join(outDir, 'screen.mp4')
  log('mock', `placeholder screen recording (${durationSec}s)`)
  await run([
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x123A4A:s=1080x1920:r=30:d=${durationSec}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    out,
  ])
  return out
}
