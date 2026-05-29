import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import { CAPTION_STYLE, writeSrt } from './captions.js'
import { log } from './util.js'

function run(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })
    let err = ''
    p.stderr.on('data', (d) => { err += d.toString() })
    p.on('error', reject)
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(bin)} exited ${code}:\n${err.slice(-800)}`))))
  })
}

async function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffprobe.path, ['-v', 'quiet', '-print_format', 'json', '-show_format', file])
    let out = ''
    p.stdout.on('data', (d) => { out += d.toString() })
    p.on('error', reject)
    p.on('close', () => {
      try { resolve(parseFloat(JSON.parse(out).format.duration)) } catch (e) { reject(e) }
    })
  })
}

/**
 * Compose the final 9:16 TikTok video:
 *   - screen recording fills the 1080x1920 canvas (looped/trimmed to presenter length)
 *   - presenter as a picture-in-picture, bottom-right
 *   - presenter audio is the soundtrack
 *   - captions burned in (navy/gold) from the .srt
 *
 * @returns {Promise<string>} local path to final.mp4
 */
export async function stitch({ presenter, screen, spokenText, outDir }) {
  const duration = await probeDuration(presenter)
  const out = path.join(outDir, 'final.mp4')
  // Now that we know the real presenter length, write correctly-timed captions.
  const srtPath = writeSrt(spokenText || '', duration, path.join(outDir, 'captions.srt'))
  const hasCaptions = srtPath && fs.existsSync(srtPath) && fs.statSync(srtPath).size > 0

  const filters = [
    '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg]',
    '[1:v]scale=420:-2[pip]',
    `[bg][pip]overlay=W-w-40:H-h-260${hasCaptions ? '[ov]' : '[v]'}`,
  ]
  // Run ffmpeg with cwd=outDir so the subtitles filter can use a bare filename
  // (avoids the filtergraph path-escaping headache with ':' on absolute paths).
  if (hasCaptions) {
    filters.push(`[ov]subtitles=${path.basename(srtPath)}:force_style='${CAPTION_STYLE}'[v]`)
  }

  const args = [
    '-y',
    '-stream_loop', '-1', '-i', path.resolve(screen),
    '-i', path.resolve(presenter),
    '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '1:a?',
    '-t', String(duration),
    '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    'final.mp4',
  ]

  log('stitch', `ffmpeg → 1080x1920, ${duration.toFixed(1)}s${hasCaptions ? ', captions on' : ''}`)
  await run(ffmpegPath, args, { cwd: outDir })
  return out
}
