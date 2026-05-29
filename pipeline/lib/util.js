import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const COLORS = { dim: '\x1b[2m', cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', reset: '\x1b[0m' }
export function log(step, msg) {
  process.stdout.write(`${COLORS.cyan}[${step}]${COLORS.reset} ${msg}\n`)
}
export function ok(msg) { process.stdout.write(`${COLORS.green}✓${COLORS.reset} ${msg}\n`) }
export function warn(msg) { process.stdout.write(`${COLORS.yellow}!${COLORS.reset} ${msg}\n`) }

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n])
  if (missing.length) {
    throw new Error(`Missing required env var(s): ${missing.join(', ')} — see pipeline/.env.example`)
  }
}

/** Download a remote file to disk. */
export async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`)
  ensureDir(path.dirname(dest))
  await pipeline(res.body, fs.createWriteStream(dest))
  return dest
}

/** Poll fn() until predicate(result) is true or timeout. */
export async function pollUntil(fn, predicate, { intervalMs = 5000, timeoutMs = 600000, label = 'job' } = {}) {
  const start = Date.now()
  for (;;) {
    const result = await fn()
    if (predicate(result)) return result
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${label}`)
    await sleep(intervalMs)
  }
}
