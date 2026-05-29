<!-- Pre-filled for Nexxt Site Manager. Edit freely — this file is read by the
     Arcads skill before composing prompts. It is gitignored by default in the
     pack; it was force-added here so the team shares one brand context. -->

# Master context (project + agents)

**Purpose:** One place for humans and AI agents to capture **decisions**, **brand voice**, **API quirks**, and **what we learned** while generating creative for Nexxt Site Manager.

## How agents should use this file

- **At the start of substantive work:** Read this file for project-specific context that is not in the skill.
- **After meaningful changes:** Append a new **dated entry** under [Changelog](#changelog).
- **If fields are empty:** Offer to populate them — ask the user once and write the values back.

## Brand — Nexxt Site Manager

- **Product:** Nexxt Site Manager — AI-powered construction document tools for Victorian builders. Turns the paperwork that eats a builder's nights (progress claims, SWMS, variations, plan reading) into something done from a phone on site.
- **Tone:** Punchy, direct, Australian tradie language. Talk like a builder on site, not a SaaS brochure. Short sentences. No corporate speak, no "leverage / solutions / streamline / empower." Swearing-adjacent attitude, but clean.
- **Audience:** Victorian site supervisors and builders (residential + commercial). Time-poor, on the tools, sceptical of "another app." Speak to the bloke running the site.
- **Words to use:** site, sparkie/chippie/subbie, on the tools, knock-off, smoko, WorkSafe, progress claim, variation, mate, sorted, dead simple.
- **Words to avoid:** synergy, leverage, solution, platform, empower, seamless, revolutionary, "in today's fast-paced world."

### Brand colours
- **Navy** `#0F1B2E` — primary / backgrounds / chrome
- **Gold** `#C9952A` — accent, CTAs, highlights, captions emphasis
(Keep captions/lower-thirds on navy with gold accents for on-brand consistency.)

### Hook style (first 3 seconds — problem-first)
Always open with the pain, not the product. Examples:
- "Still doing progress claims at 10pm?"
- "WorkSafe rocks up tomorrow — where's your SWMS?"
- "Client reckons you were late. Your site diary says otherwise."
Then: agitate for one beat → show Nexxt solving it → CTA.

### Call to action
- **Primary CTA:** "Link in bio — start free"
- Spoken variant: "Start free, link's in the bio."

### Distribution
- **TikTok account:** [@nextgenhustle365](https://www.tiktok.com/@nextgenhustle365)
- **Format:** vertical `9:16`, 30–60s, captions burned in (loud rooms / sound-off viewing).

### Key tools to feature (one tool per video works best)
| Tool | One-line angle |
|------|----------------|
| **Progress Claim** | Get paid faster — SOPA-stamped claim sent before you leave site. |
| **SWMS** | WorkSafe-ready Safe Work Method Statement in 2 minutes. |
| **Trade Splitter** | Carve one set of plans into a scope pack per trade in a tap. |
| **Plan Reader** | Reads all 40 pages so you don't miss the note that bites. |
| **EOT Notice** | Claim your rain days before the deadline — don't wear the damages. |

Scripts for these live in the app repo at `walkthrough-nexxt/` — reuse the VOICEOVER lines as the AI actor's spoken script.

## Reference images

Drop reference images into `references/` at the pack root (gitignored, local-only):
- `references/influencers/` — face/body photos for the AI presenter (pick someone who reads as an Aussie tradie / site supervisor: hi-vis, hard hat, ute/site backdrop).
- `references/products/` — Nexxt Site Manager app screenshots / UI for showcase frames.
- `references/aesthetics/` — navy + gold mood boards, site lighting refs.

## Universal prompting principles (carried from template)

### UGC realism
- **Camera imperfection block** on every UGC prompt: motion blur, overexposure, grain, lens distortion, off-centre framing, soft focus.
- **Skin realism block:** "visible pores, slight unevenness in skin tone, minor undereye shadows, hint of shine from natural oils." Never acne/blemishes/redness.
- **Reference order:** character hero first, then product, then style.

### Video prompting
- Append "no subtitles, no captions, no text overlays" to every generation prompt (we burn our own navy/gold captions afterwards).
- Person-on-screen needs 3–4 human motion cues (head tilts, weight shifts, breaking eye contact, grip adjustments) or the presenter looks frozen.
- Presenter should look like a real Victorian tradie: hi-vis or work shirt, on/near a site, natural daylight.

### Influencer / character recreation
- Two-step: (1) generate a still with the reference, (2) get user approval, (3) only then generate video from the approved still. Never skip approval — video is expensive.

## Project snapshot — Arcads

- **API base:** `https://external-api.arcads.ai` (see `.env.example`).
- **Auth:** HTTP Basic via `ARCADS_BASIC_AUTH` (pre-encoded `Basic ...` header) or `ARCADS_API_KEY`. Values in `.env` must be **single-quoted**.
- **Skill:** `.claude/skills/arcads-external-api/` (synced from `skills/arcads-external-api/` via `scripts/sync-skill.sh`).
- **Note:** Arcads generates the AI presenter + voiceover. Actual app screen-recordings are filmed separately and stitched/captioned (see `shared/skills/caption-video/`). Arcads does not embed your real UI footage.

## My workspace

- **Default product ID:** _(auto-populated after first `GET /v1/products` call — create a "Nexxt Site Manager" product)_
- **Default product name:** Nexxt Site Manager

## Credit costs

_Fill in from your Arcads dashboard before generating — the agent checks this first._

| Model | Credits per generation | Notes |
|-------|----------------------|-------|
| Veo 3.1 | 1 | Same cost at 720p/1080p/4K |
| Sora 2 | _(fill in)_ | |
| Kling 3.0 (b-roll) | _(fill in)_ | |
| Nano Banana 2 (image) | 0.03 | ~35s |

## Changelog

- **2026-05-29 — Decision:** Pre-filled brand context for Nexxt Site Manager (navy `#0F1B2E` / gold `#C9952A`, Aussie-tradie tone, problem-first hooks, "Link in bio — start free" CTA, TikTok @nextgenhustle365). Key tools to feature: Progress Claim, SWMS, Trade Splitter, Plan Reader, EOT Notice. Why: keep all generated TikTok creative on-brand without re-briefing each run.
