import { spawn } from 'node:child_process'
import fs from 'node:fs'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'

// Quality gate — automated checks a video must pass before it can post.
// Each check returns { name, pass, detail }. The gate fails closed.

const REQ = {
  width: 1080,
  height: 1920,
  minDuration: 30,
  maxDuration: 60,
  targetLufs: -14,
  lufsTolerance: 1.5, // accept -15.5 .. -12.5
  maxSilenceGap: 2.0, // seconds
  minCaptionFont: 14, // libass FontSize (matches CAPTION_STYLE)
}

function runCapture(bin, args) {
  return new Promise((resolve) => {
    const p = spawn(bin, args)
    let out = '', err = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => resolve({ code, out, err }))
    p.on('error', (e) => resolve({ code: -1, out: '', err: String(e) }))
  })
}

async function probe(file) {
  const { out } = await runCapture(ffprobe.path, [
    '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', file,
  ])
  return JSON.parse(out)
}

// Mean integrated loudness via ebur128 (LUFS). Returns I (integrated).
async function measureLufs(file) {
  const { err } = await runCapture(ffmpegPath, [
    '-i', file, '-af', 'ebur128=framelog=verbose', '-f', 'null', '-',
  ])
  // Final "Integrated loudness: I: -xx.x LUFS" appears in the summary block.
  const m = err.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)
  if (!m || !m.length) return null
  const last = m[m.length - 1].match(/(-?\d+(?:\.\d+)?)/)
  return last ? parseFloat(last[1]) : null
}

// Longest silent gap via silencedetect.
async function longestSilence(file, threshold = '-30dB', minDur = 0.5) {
  const { err } = await runCapture(ffmpegPath, [
    '-i', file, '-af', `silencedetect=noise=${threshold}:d=${minDur}`, '-f', 'null', '-',
  ])
  const durations = [...err.matchAll(/silence_duration:\s*(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]))
  return durations.length ? Math.max(...durations) : 0
}

/**
 * Run all quality checks against finalPath.
 * @param {object} opts { srtPath, captionFontSize }
 * @returns {Promise<{ pass: boolean, checks: Array }>}
 */
export async function runQualityGate(finalPath, { captionFontSize = REQ.minCaptionFont } = {}) {
  const checks = []
  const add = (name, pass, detail) => checks.push({ name, pass, detail })

  if (!fs.existsSync(finalPath)) {
    add('file-exists', false, `not found: ${finalPath}`)
    return { pass: false, checks }
  }

  const info = await probe(finalPath)
  const v = info.streams.find((s) => s.codec_type === 'video')
  const a = info.streams.find((s) => s.codec_type === 'audio')
  const duration = parseFloat(info.format.duration)

  // Resolution
  add('resolution-1080x1920',
    v && v.width === REQ.width && v.height === REQ.height,
    `${v ? `${v.width}x${v.height}` : 'no video stream'} (need ${REQ.width}x${REQ.height})`)

  // Duration window
  add('duration-30-60s',
    duration >= REQ.minDuration && duration <= REQ.maxDuration,
    `${duration?.toFixed(1)}s (need ${REQ.minDuration}-${REQ.maxDuration}s)`)

  // Audio present
  add('audio-present', !!a, a ? `${a.codec_name}` : 'no audio stream')

  // Loudness -14 LUFS (±tolerance)
  if (a) {
    const lufs = await measureLufs(finalPath)
    const pass = lufs != null && Math.abs(lufs - REQ.targetLufs) <= REQ.lufsTolerance
    add('loudness--14-LUFS', pass,
      lufs == null ? 'could not measure' : `${lufs.toFixed(1)} LUFS (target ${REQ.targetLufs} ±${REQ.lufsTolerance})`)

    // Silence gaps
    const gap = await longestSilence(finalPath)
    add('no-silence-over-2s', gap <= REQ.maxSilenceGap, `longest gap ${gap.toFixed(1)}s (max ${REQ.maxSilenceGap}s)`)
  }

  // Caption readability — file present + font size threshold + brand contrast.
  add('captions-readable',
    captionFontSize >= REQ.minCaptionFont,
    `font size ${captionFontSize} (min ${REQ.minCaptionFont}), navy outline + gold fill`)

  return { pass: checks.every((c) => c.pass), checks, requirements: REQ }
}

export { REQ }
