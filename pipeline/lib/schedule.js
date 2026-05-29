// Auto-scheduling for the 15 walkthrough videos.
//
// Rules:
//   - Best AEST windows: 06:00–07:00 (before site) and 19:00–21:00 (after work)
//   - Minimum 4 hours between posts (the two daily slots are ~13h apart, so the
//     real constraint is just "max one morning + one evening per day")
//   - Spread across 2 weeks (14 days) → 2 slots/day = 28 capacity for 15 videos
//
// AEST is UTC+10 (no DST handling — Victoria observes AEDT in summer, but TikTok
// scheduling is approximate; adjust OFFSET if posting during AEDT).

const AEST_OFFSET_HOURS = 10
const MIN_GAP_HOURS = 4
const SLOTS = [
  { hour: 6, minute: 30, label: 'before site (AEST 6:30am)' },
  { hour: 19, minute: 30, label: 'after work (AEST 7:30pm)' },
]

// Convert an AEST wall-clock time on a given day to a UTC Date.
function aestToUtc(baseUtc, dayOffset, hour, minute) {
  const d = new Date(baseUtc)
  d.setUTCDate(d.getUTCDate() + dayOffset)
  d.setUTCHours(hour - AEST_OFFSET_HOURS, minute, 0, 0)
  return d
}

/**
 * Build a posting schedule.
 * @param {string[]} toolKeys ordered list of videos to schedule
 * @param {object} opts { startDate?: Date (defaults to tomorrow), days?: number }
 * @returns {Array<{ tool, postAtUtc, postAtAest, slot }>}
 */
export function buildSchedule(toolKeys, { startDate, days = 14 } = {}) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() + 24 * 3600 * 1000)
  const startUtcMidnight = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))

  const schedule = []
  let lastUtc = null
  outer: for (let day = 0; day < days; day++) {
    for (const slot of SLOTS) {
      if (schedule.length >= toolKeys.length) break outer
      const postAtUtc = aestToUtc(startUtcMidnight, day, slot.hour, slot.minute)
      if (postAtUtc.getTime() < Date.now()) continue // skip past slots
      if (lastUtc && (postAtUtc - lastUtc) / 3600000 < MIN_GAP_HOURS) continue
      const tool = toolKeys[schedule.length]
      schedule.push({
        tool,
        postAtUtc: postAtUtc.toISOString(),
        postAtAest: new Date(postAtUtc.getTime() + AEST_OFFSET_HOURS * 3600000)
          .toISOString().replace('T', ' ').slice(0, 16) + ' AEST',
        slot: slot.label,
      })
      lastUtc = postAtUtc
    }
  }
  return schedule
}

export function printSchedule(schedule) {
  console.log(`\n📅 Posting schedule (${schedule.length} videos):`)
  for (const s of schedule) {
    console.log(`  ${s.postAtAest.padEnd(22)} ${s.tool.padEnd(18)} ${s.slot}`)
  }
}

export { SLOTS, MIN_GAP_HOURS }
