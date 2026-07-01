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

## Data pipeline

`npm run build:data` runs `scripts/build-data.ts`, which assembles the commander pool from
EDHREC rankings enriched with Scryfall card data and downloads/optimizes card art to WebP.
In production this runs on a daily GitHub Actions schedule so the puzzle pool stays current.

## Deploy

Static build (`dist/`) served on Cloudflare Pages. `public/_redirects` provides the SPA
fallback so every mode route resolves to the single-page bundle.
