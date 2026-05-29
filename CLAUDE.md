# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**OH&S Builder Victoria** ("Nexxt Site Manager") — a construction occupational health & safety
and compliance platform for Victorian (Australia) builders and their workers. Currently a
**frontend-only Vite + React SPA** with mock data; Supabase (backend/auth/db) and Stripe
(billing) are being integrated.

Deployed on Vercel (team `nexxt-next-group's-projects`, project `ohs-builder-victoria`,
framework `vite`, Node `24.x`).

## Commands

```bash
npm install            # install dependencies
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # production build to dist/
npm run preview        # serve the production build (port 4173)
npm run lint           # ESLint over src/
npm test               # run Vitest once (CI mode)
npm run test:watch     # Vitest watch mode
npx vitest run path/to/file.test.jsx   # run a single test file
npx vitest run -t "name of test"        # run tests matching a name
```

## Architecture

This is a client-side React 18 app routed entirely in the browser with `react-router-dom` v6.
There is **no backend in this repo yet** — all data comes from `src/data/mockData.js`. When wiring
real data, replace mock imports with Supabase queries rather than threading props through.

### Two distinct workspaces (the core structural split)
The app serves two different audiences via two layouts, both defined in `src/App.jsx`:

- **Builder workspace** (`BuilderLayout`) — full management surface: dashboard, projects,
  compliance, site diary, incidents, near-miss, toolbox talks, SWMS management, admin, reports,
  settings. Routes are top-level (`/dashboard`, `/projects/:id`, …).
- **Worker workspace** (`WorkerLayout`) — restricted "tradie" flow under `/worker/*`:
  registration, induction, quiz, SWMS signing. Intentionally limited surface.

`/` is the shared `Login` page; unknown routes redirect to `/`. When adding a page, register it
under the correct layout in `App.jsx` and keep worker-facing screens inside the `/worker` subtree.

### Layout / page / component layering
- `src/layouts/*` — shell (nav, chrome) wrapping each workspace via React Router `<Outlet>`.
- `src/pages/*` (and `src/pages/worker/*`) — one component per route.
- `src/components/ui.jsx` — shared presentational primitives (`PageHeader`, `StatCard`, etc.).
  **Prefer composing these** over bespoke markup so styling stays consistent.
- `src/components/Charts.jsx` — Recharts wrappers. `src/components/Logo.jsx` — brand mark.

### Styling
Tailwind CSS with a domain-specific palette in `tailwind.config.js`: `navy` (primary brand /
chrome), `brand` (blue accents/CTAs), `safety` (orange, for warnings/hazard emphasis). Font is
Inter. Use these semantic color scales rather than raw Tailwind colors so the safety-domain
theming holds together.

## Integrations

- **Supabase** (`@supabase/supabase-js`) — backend, auth, Postgres. The Supabase MCP server is
  configured in `.mcp.json` and reads `SUPABASE_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` from the
  environment (also set in the Vercel project). The MCP server runs `--read-only` by default.
- **Stripe** (`stripe`) — billing/subscriptions. Server-side keys must come from env vars, never
  the client bundle (Vite exposes only `VITE_`-prefixed vars to the browser).
- **TikTok Content Posting API** — serverless functions under `api/tiktok/*` (OAuth callback,
  token refresh, direct/inbox post via `PULL_FROM_URL` from Supabase Storage). Tokens are stored
  in the `tiktok_accounts` table (`supabase/migrations/0001_tiktok_accounts.sql`). See
  `api/tiktok/README.md`. Starts in Sandbox + Upload-to-Inbox mode (no audit); direct public
  posting requires `video.publish` scope and a passed TikTok audit.

### Required environment variables (server-side, set in Vercel)
These are **not** `VITE_`-prefixed, so they never reach the browser bundle:

| Var | Used by |
| --- | --- |
| `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` | Supabase **MCP** server (`.mcp.json`) — tooling only |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | App runtime / serverless functions (service role bypasses RLS — server only) |
| `STRIPE_SECRET_KEY` | Stripe server-side calls |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth + posting (`api/tiktok/*`) |
| `TIKTOK_REDIRECT_URI`, `PUBLIC_BASE_URL` | TikTok OAuth callback + `PULL_FROM_URL` base (must be a TikTok-verified domain) |
| `TIKTOK_VIDEO_BUCKET`, `TIKTOK_VIDEO_SIGNING_SECRET` | TikTok video proxy (bucket name; signing secret defaults to `TIKTOK_CLIENT_SECRET`) |

Serverless API routes live in `api/**` (Vercel Node functions). `vercel.json` excludes `/api/*`
from the SPA rewrite so those routes resolve to functions, not `index.html`.

## Conventions

- ES modules throughout (`"type": "module"`); `.jsx` for components, `.js` for plain data/logic.
- React function components with hooks only; no class components.
- Routing changes go through `src/App.jsx`; do not introduce a second router.
- Secrets belong in environment variables. Only `VITE_`-prefixed env vars reach the client.
