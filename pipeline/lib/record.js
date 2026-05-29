import path from 'node:path'
import puppeteer from 'puppeteer'
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder'
import { log, sleep } from './util.js'

/**
 * Record a screen demo of the app at `route`, performing `steps`, to an MP4.
 * The app must already be running and reachable at baseUrl.
 *
 * @returns {Promise<string>} local path to screen.mp4
 */
export async function recordScreen({ route, steps = [], outDir, baseUrl }) {
  // Fail fast with a clear message if the app isn't up.
  try {
    await fetch(baseUrl, { method: 'HEAD' })
  } catch {
    throw new Error(`App not reachable at ${baseUrl}. Start it first (e.g. \`npm run preview\`) or set APP_BASE_URL.`)
  }

  const dest = path.join(outDir, 'screen.mp4')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1080,1920'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
    await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'networkidle2', timeout: 60000 })

    const recorder = new PuppeteerScreenRecorder(page, { fps: 30, videoFrame: { width: 1080, height: 1920 } })
    await recorder.start(dest)
    log('record', `recording ${route}…`)

    for (const step of steps) {
      switch (step.action) {
        case 'wait':
          await sleep(step.ms ?? 1000)
          break
        case 'goto':
          await page.goto(new URL(step.route, baseUrl).toString(), { waitUntil: 'networkidle2' })
          break
        case 'click':
          await page.waitForSelector(step.selector, { timeout: 10000 })
          await page.click(step.selector)
          break
        case 'type':
          await page.waitForSelector(step.selector, { timeout: 10000 })
          await page.type(step.selector, step.text ?? '', { delay: 40 })
          break
        case 'scroll':
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), step.y ?? 0)
          break
        default:
          log('record', `skipping unknown step "${step.action}"`)
      }
    }

    await recorder.stop()
    return dest
  } finally {
    await browser.close()
  }
}
