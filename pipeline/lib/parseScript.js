import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SCRIPTS_DIR = path.resolve(HERE, '..', '..', 'walkthrough-nexxt')

// Strip surrounding markdown/quote noise from an extracted block.
function clean(block) {
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*]\s*/, '').replace(/^"|"$/g, '').replace(/^"|"$/g, ''))
    .join('\n')
    .trim()
}

// Pull the text between a section header (matched by keyword) and the next
// bold header / horizontal rule. Headers look like: **🎯 HOOK (first 3 seconds):**
function section(md, keyword) {
  const re = new RegExp(`\\*\\*[^\\n]*${keyword}[^\\n]*\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)`, 'i')
  const m = md.match(re)
  return m ? clean(m[1]) : ''
}

/**
 * Parse a walkthrough-nexxt/*.md script into structured fields.
 * Returns { hook, voiceover, onScreenSteps[], captionSuggestions[], hashtags, cta }.
 */
export function parseScript(scriptFile) {
  const full = path.isAbsolute(scriptFile) ? scriptFile : path.join(SCRIPTS_DIR, scriptFile)
  if (!fs.existsSync(full)) throw new Error(`Script not found: ${full}`)
  const md = fs.readFileSync(full, 'utf8')

  const hook = section(md, 'HOOK').split('\n')[0] || ''
  const voiceover = section(md, 'VOICEOVER')
  const onScreen = section(md, 'ON-SCREEN')
  const captions = section(md, 'CAPTION')
  const hashtags = section(md, 'HASHTAGS').replace(/\n/g, ' ').trim()
  const cta = section(md, 'CALL TO ACTION').split('\n')[0] || 'Link in bio — start free'

  return {
    file: full,
    hook,
    voiceover,
    // The lines the AI actor speaks = hook + voiceover.
    spokenScript: [hook, voiceover].filter(Boolean).join(' '),
    onScreenSteps: onScreen.split('\n').map((l) => l.replace(/^\d+\.\s*/, '')).filter(Boolean),
    captionSuggestions: captions.split('\n').filter(Boolean),
    hashtags,
    cta,
  }
}
