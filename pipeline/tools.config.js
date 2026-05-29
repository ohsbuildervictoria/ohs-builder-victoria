// Per-tool config: which walkthrough script to read, which app screen to
// record, and the interaction steps Puppeteer performs while recording.
//
// IMPORTANT: the live repo app (OH&S Builder) does not yet ship the
// "Progress Claim" tool screen described in the walkthrough script. Point
// `route` + `steps` at the real screen once it exists. Until then the demo
// records whatever route is set here (a placeholder) so the rest of the
// pipeline can be exercised end-to-end.

export const tools = {
  'progress-claim': {
    title: 'Progress claims, sorted before you leave site 👷 #VicBuilder',
    script: '01_progress_claim.md',
    route: '/progress-claim',
    // Each step: { action: 'goto'|'click'|'type'|'wait'|'scroll', ... }
    // Selector ids live in src/pages/ProgressClaim.jsx.
    steps: [
      { action: 'wait', ms: 1200 },
      { action: 'click', selector: '#pc-stage-2' }, // tick "Lock-up stage"
      { action: 'wait', ms: 800 },
      { action: 'click', selector: '#pc-add-variation' },
      { action: 'wait', ms: 800 },
      { action: 'click', selector: '#pc-generate' },
      { action: 'wait', ms: 1200 },
      { action: 'scroll', y: 500 },
      { action: 'wait', ms: 1200 },
    ],
  },

  // Stubs for the other featured tools — fill route/steps as screens ship.
  swms: { title: 'WorkSafe-ready SWMS in 2 minutes ⛑️', script: '03_swms_generator.md', route: '/swms', steps: [{ action: 'wait', ms: 2000 }] },
  'trade-splitter': { title: 'Split plans across every trade in one tap', script: '13_trade_splitter.md', route: '/dashboard', steps: [{ action: 'wait', ms: 2000 }] },
  'plan-reader': { title: 'It reads all 40 pages so you don’t miss the note that bites', script: '12_plan_reader.md', route: '/dashboard', steps: [{ action: 'wait', ms: 2000 }] },
  'eot-notice': { title: 'Claim your rain days before the deadline ☔', script: '09_eot_notice.md', route: '/dashboard', steps: [{ action: 'wait', ms: 2000 }] },
}

export function resolveTool(key) {
  const cfg = tools[key]
  if (!cfg) {
    throw new Error(`Unknown tool "${key}". Known: ${Object.keys(tools).join(', ')}`)
  }
  return cfg
}
