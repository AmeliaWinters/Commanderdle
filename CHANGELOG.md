# Changelog

All notable player-facing changes to Commandle. Newest first. Dates are the day the work
landed on `main`. This log is maintained by hand — add an entry at the top whenever you ship
a change that a player could notice.

## 2026-07-06

- In The Binder, found cards now read "Found {date} in {mode}" and no longer show the
  colored mode dots or the corner tick on the art. Undiscovered commanders now show in
  full-opacity grayscale instead of dimmed.
- Higher/Lower, Price Is Right, The Binder and Grid now share the "Commandle" wordmark
  in their header, with the game's name shown as a subtitle just beneath it.
- Higher/Lower, Price Is Right, The Binder and Grid now have their own settings cog
  in the header, so you can toggle sound effects (and the daily reminder) from any game.
- Grid rarity gems now use authentic MTG set-symbol icons (via the Keyrune font),
  and in a grid cell the gem sits just to the left of the commander's name.
- The Archive page now matches the rest of the site: the animated flame wordmark,
  an "Archive" badge and a tidier "Back to today" button.
- Grid guesses are now graded like MTG rarities: a correct pick almost nobody else
  made is a Mythic Rare (10 pts), 5% or fewer is a Rare (5 pts), 10% or fewer an
  Uncommon (3 pts), everything else a Common (1 pt). Each pick gets a rarity-coloured
  frame and set-symbol gem right on the grid, a running score shows while you play,
  every correct guess announces its rarity and points, and the final score with a
  rarity breakdown appears in results and shares. The "who else fit here" modal now
  shows each answer's rarity gem and the share of players who picked it.
- Correct guesses in Higher/Lower and Grid now play a bright victory chime instead
  of the generic guess sound.
- Fixed the grid spilling off the right edge of the screen on small phones.
- Fixed the Card pool (and How to play) popup instantly closing itself when opened
  on a touch screen — tapping the button now reliably opens it.
- Fixed the settings cog overlapping the title on mobile.
- The Binder page now explains what the binder actually is: a lifetime collection
  where every commander you've ever guessed correctly flips face-up.
- Added a hint on the grid results screen that you can tap any cell to see every
  commander that fit.
- Tidied the settings menu: removed the Higher/Lower and Price Is Right shortcuts
  (they live in All games), and the debug Reset — plus a new "clear all data"
  wipe — now only appear in dev builds.
- Reworded grid mode text and share/recap messages to drop em dashes in favour of
  plainer punctuation, and removed a stray emoji from the grid results hint.
- Fixed the zoomed card preview on mobile flickering closed then back open when you
  tap the same commander a second time — a second tap now just dismisses it.
- Fixed the card preview not appearing when you hover or tap a commander in the
  grid "who else fit here" reveal — the zoomed card was hidden behind the panel.
- Grid mode now shows the same live "Next grid in HH:MM:SS" countdown as the daily
  modes, instead of the vaguer "a new grid arrives at midnight."
- The title wordmark now wobbles, springs, and puffs embers on every mode's page —
  Higher/Lower, Price Is Right, Grid, the Binder, and the games hub — matching the
  daily modes.
- After finishing a grid you can tap any cell to see every commander that fit there,
  each with its art and the share of all players who picked it — hover or tap a
  card's art to zoom in on the full card.
- Grid mode's commander search now matches the daily games: card-art thumbnails,
  EDHREC rank, and arrow-key/Enter navigation instead of a plain list.
- Grid mode now shares through the same Share menu as the daily modes (share as
  text or challenge a friend), replacing its one-off share button.
- Skipped turns now appear in the guess list too, shown as a "Skipped" row in the
  order you took them, so your full run of the puzzle is visible.
- Pressing the "Commandle" title now returns you to the games hub once the ember burst finishes.
- The Binder now has an "← All games" back button to return to the games hub.
- Fixed the Classic clue table losing its layout — the new Grid game's styles were
  bleeding into it and flattening every row.
- Binder cards you've found now show the date you **first found** them right on the sleeve,
  plus a gilt "found" seal and small dots for each mode you've cracked them in.
- Title-screen tiles now have distinct icons: up/down arrows for Higher / Lower, a coin
  for Price Is Right, and a grid for Grid — no more identical card backs.
- **The Binder** moved into its own panel, separate from the bonus games.
- The Binder now only collects commanders you find in the **live daily** puzzles. Archive
  replays, practice/unlimited and the bonus games no longer add cards to it.
- New bonus game: **Grid** (`/grid`) — an Immaculate-Grid-style daily 3×3. Rows and
  columns are criteria (color identities, creature types, mana value, decks, price,
  release year...); fill every cell with a commander matching both. Nine guesses total,
  and rarer answers score better: after finishing you see what percentage of players
  picked each of your answers and an overall rarity score.
- The commander pool behind Grid runs 1,000 deep (top 1,000 on EDHREC) — twice the pool
  of the other modes — and loads only when you open Grid, so page load is unaffected.
- The **All Games** title screen now lives at the site root (`/`) — Classic moved to
  `/classic`; old `/games` links still work.
- MTG-themed makeover for the title screen: commander art behind each mode tile, a
  flavour-matched mana pip per mode, the classic card back on the bonus-game tiles,
  colour-pie frame accents, and a foil shine on hover.
- Fixed the "completed today" ticks floating to the top corner of the screen instead of
  sitting on their mode tile.
- New page: **The Binder** (`/binder`) — your collection of every commander you've ever
  guessed correctly, laid out like a trade binder. Found commanders show face-up card art;
  the rest stay face-down until you find them. Filter by name, color identity, or
  found/missing, with a progress bar toward the full pool. Wins in any daily mode, archive
  replay or practice game count, and past wins still saved in your browser are counted
  retroactively. Linked from the title screen and the footer.

## 2026-07-05

- New bonus game: **Price Is Right** (`/price-is-right`) — guess the daily commander's
  market price in 6 tries with higher/lower arrows and hot/warm/cold hints, plus an
  Endless streak mode.
- New **All Games** title screen (`/games`) listing the five daily modes and the bonus
  games in one place; reachable from the settings menu and the bonus games' back links.
- Added color-identity nicknames: mana pips now show the guild/shard/wedge name on hover
  (e.g. "Rakdos", "Temur"), and you can search commanders by those names too.
- Results screen now links the commander's EDHREC rank straight to its EDHREC page.
- Footer now shows data provenance and freshness ("refreshed daily — last updated …") and
  full Wizards of the Coast Fan Content Policy attribution.
- New face-down card back that flips to reveal the answer, plus a smoother win animation.
- Added the ghost race and daily hero card; card art now only shown from guess 3 onward.
- Theming pass and footer cleanup.
- Accessibility improvements, share-as-image, cookie consent, and rate limiting to protect
  the global stats and contact form from spam.
- Renamed the project from Commanderdle to Commandle.

## 2026-07-04

- Global solve stats and the deduction row; guess animations only fire on a guess, not on load.
- Major load-time work: card data moved out of the JS bundle, non-render-blocking CSS,
  background images, and a loading skeleton on boot to cut blocking time.
- Mobile card backdrop and skip-bug fixes.

## 2026-07-03

- Animation polish and mobile layout improvements.

## 2026-07-02

- Broke the app into smaller components; DRY/architecture cleanup and bugfixes.
- Removed the card pool from Silhouette and Zoom modes, added the synergy-percentage popover,
  and improved the mobile search popover.
- Reduced-motion support and a reworked results screen.

## 2026-07-01

- Added the archive (play past puzzles), daily reminder, and PWA install support.
- Puzzle share grids, per-mode stats panel, "next commander in" countdown, and the
  Higher / Lower side game.
- Synergy scores shown in Synergy mode; favicons and sound effects.

## 2026-06-30

- Mana pips for color identity; guesses reduced from 6 to 5, with skips.
- Self-hosted card art and an improved deduction/design pass.

## 2026-06-29

- Initial build of Commandle: the daily MTG commander guessing game, with the
  Battlefield-Cast card-frame theme and flame styling.
