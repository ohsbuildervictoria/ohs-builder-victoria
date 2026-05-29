import fs from 'node:fs'
import path from 'node:path'

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000))
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  const f = String(ms % 1000).padStart(3, '0')
  return `${h}:${m}:${s},${f}`
}

// Split spoken text into short reading phrases (~6 words) for snappy captions.
function toPhrases(text) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const phrases = []
  for (let i = 0; i < words.length; i += 6) phrases.push(words.slice(i, i + 6).join(' '))
  return phrases.filter(Boolean)
}

/**
 * Build an .srt that spans `durationSec` (the presenter audio length),
 * distributing phrases evenly. Naive but good enough for a first pass; swap
 * for word-level Whisper timing later for tighter sync.
 */
export function writeSrt(spokenText, durationSec, destPath) {
  const phrases = toPhrases(spokenText)
  if (!phrases.length || !durationSec) {
    fs.writeFileSync(destPath, '')
    return destPath
  }
  const per = durationSec / phrases.length
  const lines = phrases.map((p, i) => {
    const start = i * per
    const end = Math.min(durationSec, (i + 1) * per - 0.05)
    return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${p}\n`
  })
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, lines.join('\n'))
  return destPath
}

// libass force_style in Nexxt brand colours (navy #0F1B2E bg box, gold #C9952A text).
// ASS colours are &HBBGGRR (and AABBGGRR for alpha).
// Single source of truth for caption font size (read by the quality gate).
export const CAPTION_FONT_SIZE = 15

export const CAPTION_STYLE = [
  'FontName=Arial',
  `FontSize=${CAPTION_FONT_SIZE}`,
  'Bold=1',
  'PrimaryColour=&H002A95C9', // gold #C9952A -> BGR 2A95C9
  'OutlineColour=&H002E1B0F', // navy #0F1B2E -> BGR 2E1B0F
  'BorderStyle=3',
  'Outline=4',
  'Shadow=0',
  'Alignment=2',
  'MarginV=120',
].join(',')
