# Commandle — project notes for Claude

Commandle is a daily Magic: The Gathering commander guessing game. Front-end only
React + TypeScript, built with Vite, deployed static on Cloudflare Pages. Commander data is
refreshed daily by a GitHub Action (`scripts/build-data.ts`) and self-hosted as WebP art.

The target audience is the MTG community, so correctness and community credibility matter:
mana symbols in canonical WUBRG order, correct guild/shard/wedge names, and proper
EDHREC/Scryfall + Wizards Fan Content Policy attribution.

## Conventions

- Mobile-first; keep source files under ~300 lines (split components/libs when they grow).
- Never hardcode the owner's contact email in the repo or bundle.
- The daily answer is deterministic (`src/lib/dailyAnswer.ts`) — do not change its seeding
  lightly; every player must get the same puzzle.

## Changelog — REQUIRED

At the end of **every** change that a player could notice, add an entry to the top of
`CHANGELOG.md` under today's date (create the date heading if it's a new day). Keep entries
short and player-facing (what changed, not how). Skip purely internal refactors that have no
visible effect.
