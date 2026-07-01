# Commandle

A daily **Magic: The Gathering** commander guessing game. One deterministic puzzle per day
across five modes — everyone gets the same answer, then shares a spoiler-free result grid.

- **Classic** — deduce the commander from colors, type, and stat clues.
- **Silhouette** — name it from the card-art outline.
- **Zoom** — identify it from a crop that widens with each guess.
- **Synergy** — guess it from the cards it synergizes with most.
- **Quote** — place it from its flavor text.
- **Higher / Lower** — a bonus endless-run side game.

Front-end only React + TypeScript, built with Vite, deployed static on Cloudflare Pages.
Commander data is refreshed daily by a GitHub Action and self-hosted as WebP art.

## Getting started

```bash
npm install
npm run dev        # local dev server (Vite, --host)
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the built bundle
```

## Configuration (env vars)

Copy `.env.example` to `.env` (or set the same keys in the Cloudflare Pages dashboard).
All are optional — the app runs fully without them; the associated feature just stays off.

| Var | Purpose |
| --- | --- |
| `VITE_SITE_URL` | Canonical origin (no trailing slash) for canonical/OG URLs. |
| `VITE_ADSENSE_PUB_ID` | AdSense publisher id. Ads render only when this **and** the slot id are set. |
| `VITE_ADSENSE_SLOT_ID` | AdSense banner slot id. |
| `VITE_ANALYTICS_ID` | Analytics measurement id (e.g. GA4 `G-…`). |

## Architecture

- `src/lib/dailyAnswer.ts` — deterministic daily answer per mode/date; do not change lightly.
- `src/lib/useGameState.ts` — per-mode game state, persisted to `localStorage`.
- `src/lib/router.ts` — each mode is its own URL/title; also sets per-mode SEO/OG meta.
- `src/components/` — UI, one component per mode plus shared shell (header, stats, results).
- `scripts/build-data.ts` — data pipeline pulling EDHREC + Scryfall, self-hosting card art.
- `public/` — static assets: icons, `og-image.png`, `robots.txt`, `sitemap.xml`, card/mana art.
- `functions/` — Cloudflare Pages Functions (edge). `share/[mode]/[puzzle]/[grid]` serves a
  per-result page with dynamic Open Graph tags (and bounces humans to the live puzzle);
  `og/[mode]/[puzzle]/[grid]` renders the matching preview PNG via `workers-og`. Both derive
  everything from the URL using the shared, dependency-free `src/lib/shareCode.ts` codec —
  no data store. `api/stats/[mode]/[puzzle]` is the one stateful Function — see below.

## Community stats (optional backend)

Anonymous, aggregated solve statistics ("67% of players solved Classic #1 — you beat 33%").
No accounts, no PII. Fully degradable: if the database is unconfigured or down the endpoint
returns 503 and the client hides the community panel, so the game still works 100% static.

- `functions/api/stats/[mode]/[puzzle]` — `GET` returns the aggregate `{ total, wins, dist }`;
  `POST { clientId, won, guesses }` ingests one result. Submissions dedupe on
  `(mode, puzzle, client_id)`, so aggregates count distinct players, not requests.
- `src/lib/api.ts` — client (anonymous `clientId`, submit + fetch, all best-effort).
- `src/lib/globalStats.ts` — shared shape + derivations (imported by client and Function).
- `src/components/GlobalStats.tsx` — the community panel inside `StatsPanel`.

Backed by a Cloudflare **D1** database bound as `STATS_DB` (see `wrangler.toml`). One-time setup:

```bash
npx wrangler d1 create commandle-stats                 # paste the id into wrangler.toml
# mirror the STATS_DB binding in the Pages dashboard → Settings → Functions → D1 bindings
npx wrangler d1 execute commandle-stats --file functions/api/schema.sql            # local
npx wrangler d1 execute commandle-stats --remote --file functions/api/schema.sql   # prod
```

Test locally against the Functions runtime (not the plain Vite dev server):

```bash
npm run build
npx wrangler pages dev dist --port 8788
curl http://localhost:8788/api/stats/classic/1
```

## Share links (virality)

A finished daily result produces a link like `/share/classic/8/010210-120210-222222`. The grid
is encoded per cell (grey/amber/green/red) by `shareCode.ts`. Crawlers unfurl the link into a
Wordle-style card; humans are redirected to `/{mode}?from=share` (which shows a "you've been
challenged" nudge). The Functions run only on a real Pages deploy — test locally with
`npx wrangler pages dev dist` (after `npm run build`), not the plain Vite dev server.

## Data pipeline

`npm run build:data` runs `scripts/build-data.ts`, which assembles the commander pool from
EDHREC rankings enriched with Scryfall card data and downloads/optimizes card art to WebP.
In production this runs on a daily GitHub Actions schedule so the puzzle pool stays current.

## Deploy

Static build (`dist/`) served on Cloudflare Pages. `public/_redirects` provides the SPA
fallback so every mode route resolves to the single-page bundle.
