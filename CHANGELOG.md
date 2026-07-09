# Changelog

All notable player-facing changes to Commandle. Newest first. Dates are the day the work
landed on `main`. This log is maintained by hand — add an entry at the top whenever you ship
a change that a player could notice.

_Last updated: 2026-07-08 — currently on v0.10.1._

## 2026-07-09

- **Play first, sign in later** — if you finish today's puzzles while logged out and then sign in,
  those results now sync to your account instead of being left behind.

- **Header corners swapped** — your account widget now sits in the top-right and the settings cog
  in the top-left, with their menus opening on the matching side.

- **Sign-in now notes that you agree to the Terms and Privacy Policy** — a short line with links
  sits under the Google/Discord buttons, so signing in makes your agreement clear.

- **The cookie-consent banner is gone for now** — Commandle currently sets no advertising or
  analytics cookies, so there's nothing non-essential to consent to. The banner will return if
  ads or analytics are ever switched on.

- **Streak freezes now bank once every 10 days you play** (previously one per day). Each still
  quietly covers a single missed day to keep your streak alive.

- **Friends' "Today's dailies" dots now show a failed daily in red** — if a friend finished a
  mode without solving it (e.g. X/6), that dot is red instead of amber.

- **The "Possible commanders" peek now shows the full popularity range** — a close (amber)
  guess no longer trims the list to the ranks right around it. If you've bracketed the answer
  between a #110 and a #220 guess, you'll see every commander from #111 to #219.

- **Fixed the deduced number ranges** in Classic — bounds were drifting off by one
  (e.g. mana value showing `...-7` instead of `...-5`), and price ranges were off in
  non-USD currencies because the bound wasn't rounded to your chosen currency's units.

- **Signing in takes you to your account page** instead of dropping you back where you
  started, so you land straight on your profile and onboarding.

- **The Friends page got a redesign** — friends are now cards showing their level and a
  five-dot strip of how they did on today's dailies (solved, missed, or not played yet).
  Friend requests sit in their own highlighted inbox, the friends leaderboard is built
  right into the page, and there's a one-tap "copy my profile link" prompt when you
  haven't added anyone yet.

- **Friends are easier to find** — a Friends entry now lives in your account menu, with a
  red badge showing how many friend requests are waiting for you (plus a dot on your
  avatar so you don't miss it).

- **Friends on the leaderboard** — the leaderboard page now has a Global / Friends toggle,
  so you can flip between the world's top 100 and just your own circle on every metric.

## 2026-07-08

- **Streak freezes** — every day you play now banks a streak freeze, and each missed day
  automatically spends one to keep your streak alive (Duolingo-style). Long-time players are
  back-credited one freeze per day already played. Freezes cover days you skipped entirely —
  a loss still resets win streaks. Your banked total shows in the stats panel and on your
  account's Day streak card.

- **Friends have arrived** — add friends by username (or straight from their profile page)
  and race them on a private friends leaderboard at `/friends`: day streaks, win streaks,
  XP and total wins, just between you. Requests need accepting on both sides, and you can
  unfriend any time.

- **The Binder got a glow-up** — found cards are now foils: tilt them with your mouse to
  catch a holographic shine, complete with a sleeve gloss. The collection also sits on a
  proper binder-page panel. (Foils stay still on touch screens and for reduced-motion users.)

- **Choose your currency** — a new "Preferred currency" setting on your account page converts
  every card price (in the classic clue table and in Guess the cost) from USD into your pick,
  from EUR and GBP to JPY, BRL, INR and more.

- **Share menu is keyboard-friendly** — the Share dropdown now moves focus into its options
  when opened and supports arrow-key navigation for keyboard and screen-reader users.

- **Sign-in errors no longer stick in the address bar** — a failed sign-in shows its message
  and then clears the `?error=` bit from the URL so it can't linger or be shared by accident.

- **Win streak now counts individual wins** — your win streak is the number of daily wins
  you've strung together in a row across every mode (win Classic then Synergy and you're on a
  streak of 2), rather than the number of days you cleared all five modes. Any loss resets it.

- **XP bar on the account button** — the account button in the top corner now shows an XP bar
  beneath your level so you can see how close you are to the next level and watch it fill as
  you play. The bar is coloured in your flare colour.

- **Guess the cost accepts prices like `.50`** — you can now leave off the leading zero when
  entering an amount under a dollar.

- **Player profiles now show much more** — visiting another player's profile now shows their
  bonus-game streaks (Grid, Guess the cost, Higher / Lower) and a link to browse their Binder,
  alongside their flare colour and supporter badge. Signed-in players' bonus-game results now
  sync to their account so these stats can appear on their public profile.

- **Your result-screen stats are now correct when signed in** — the Played / Win % / streak /
  guess-distribution numbers come straight from your account instead of this device's local
  copy, so a win recorded elsewhere no longer shows as "0% wins" here.

- **Community stats no longer read over 100%** — the result screen now compares you against the
  *other* players ("0% of 3 other players solved this — you beat 100%") instead of a confusing
  "beat 150%".

- **The Binder no longer flickers when you're signed in** — while logged in it now shows only
  your account's collection and ignores this device's local copy, so the "commanders found"
  count stays put instead of briefly showing a stale number.

- **The Binder loads faster** — it now only renders the cards near your screen as you scroll,
  so large collections stay smooth to open and browse.

- **"Share as text" no longer opens your email app** — on desktop it now reliably copies your
  result to the clipboard instead of launching the Windows share sheet (which some players saw
  jump straight into Outlook).

- **Card pool button now shows a lock** — the "View cards in…" button is fully solid and
  displays a lock icon while it's still locked.

- **Account name now sits dead-centre** — your username is centred in the account hero,
  with the supporter gem and edit pencil trailing neatly to its right instead of nudging
  the name off to the side.

- **Name flare moved into the account hero (Mythic supporters)** — the colour picker now
  sits right under your name: tap a preset swatch to apply it instantly, hit the rainbow
  pencil chip for any custom colour (your name previews live while you pick), or the ↺
  chip to go back to the tier colour.

- **Mobile: no stray card zoom on your final guess** — tapping your last guess no longer
  pops open the card preview on top of the results screen.

- **Alternate-art avatars (Mythic supporters)** — Mythic Rare and The Creator accounts now see
  every commander's alternate printings in the avatar picker — each meaningfully different
  artwork, labelled by its collector number (e.g. #207), so you can pick the exact art you
  love. Lower tiers see only the standard art.

- **Pick your name colour (Mythic supporters)** — Mythic Rare and The Creator accounts can
  now choose a custom colour for their username and profile from the account page. Your
  rarity gem always keeps its Mythic colour.

- **Your Binder follows your account** — while signed in, your collection is stored on
  your account (built from your real daily wins) instead of only in this browser, so it
  travels between devices and can't be tampered with locally. Signed-out players keep
  their local binder as before.

- **Account name & avatar match your tier** — the name and avatar ring in the account
  widget now use your tier's color (white for common, mythic orange for Mythic, and so
  on).

- **Fixed a doubled footer** — game pages were showing the footer (and its
  attribution links) twice; now it appears once.

- **Archive is grouped by month** — past puzzles are now collapsed into
  month sections so the page stays fast and it's easy to jump to a specific
  day. Missed puzzles now show an ✕ (solved ones keep the ✓) so the two read
  apart at a glance, not just by color.

- **XP updates instantly** — finishing a daily now updates your level and XP in the
  account page and account widget right away, with no page refresh needed.

- **Empty leaderboard categories no longer hide the board** — selecting a category
  with no players now shows a short "No one on this board yet" note instead of making
  the whole leaderboard vanish.

- **Leaderboard results record reliably** — signed-in players with browser storage
  disabled or cleared (private mode, cookie-only) now have their daily results recorded
  to their account instead of silently stopping.

- **Ko-fi support button** — the home page now shows the official Ko-fi "Support me
  on Ko-FI" button instead of the plain coffee image link.

- **Supporter tier perks, spelled out** — the Support panel on your account now lists
  exactly what each tier (Uncommon, Rare, Mythic Rare) unlocks, with monthly prices.
  A quiet "Support Commandle" link also sits on the home page.

- **New The Creator tier** — a special tier with every cosmetic unlocked, always. It's
  granted by hand to the team, so its purple gem marks an official account.

- **Support on Ko-fi from your account** — the Support panel now has a direct Ko-fi
  button so you can tip in one tap.

- **Supporter tiers now renew** — a Ko-fi tip keeps your supporter tier (coloured name,
  gem and avatar ring) for 31 days; tip again any time to refresh it. If it lapses the
  cosmetics switch off, but you keep whatever avatar you'd equipped.

- **Binder count on your account** — your account page now shows how many commanders
  you've unlocked in the Binder, and links straight to it.

- **About page covers more** — the About page now explains the Binder, signing in with
  Google or Discord, and the leaderboards.

- **Fairer XP in 5-guess modes** — win XP is now measured against each mode's own guess
  limit, so the modes with five guesses are scored on the same footing as Classic's six.

- **Fewer wrongly-blocked usernames** — the username filter no longer rejects innocent
  names that happen to contain a rude substring (Scunthorpe, Raccoon, Cockpit and friends).

- **Refreshed legal pages** — the About, Privacy Policy and Terms pages now cover optional
  accounts, sign-in and Ko-fi supporter cosmetics, and make clear the daily game stays free.

- **Ko-fi nudge on locked avatars** — tapping a supporter-only avatar in the picker now
  opens a friendly popup explaining how to unlock the whole gallery by supporting on Ko-fi,
  instead of doing nothing.

- **Cleaner usernames** — usernames containing profanity or slurs are now rejected when you
  set or change your name.

- **Clearer deduction bounds** — the Clues row now writes numeric bounds as "8-" and "-62"
  (at least 8 / at most 62) instead of ">8" and "<62".

- **Ads for everyone, your choice on personalisation** — ads now always show to keep the
  game free; the cookie banner now only controls whether they're personalised.

- **Styled archive button** — the "← Archive" button while replaying a past puzzle is now
  properly styled to match the rest of the game.

- **Stable archive & lasting avatars** — past puzzles now always show the exact commander
  that was the answer that day, even after they slip out of the daily top-500 list — the
  archive no longer shifts as the rankings change. Likewise, a commander you've set as your
  avatar keeps its art forever, even if it later drops off the list.

- **Bonus game stats** — your account page now has a "Bonus game stats" section with a
  toggle between Grid, Guess the cost, and Higher / Lower, each showing your day streak,
  win streak, and highest streak. These track your play on this device.

- **Smoother loading** — the initial loading screen is now just a simple spinner on the page
  background, instead of a placeholder layout that flickered as the game finished loading.

- **Color pips in Grid** — color-identity criteria in Grid mode now show their mana pips
  next to the name (e.g. Boros gets a red and white pip), matching Classic Grid.

- **Give up in Grid** — a new "Give up" button in Grid mode lets you jump straight to the
  results screen when you're done guessing.

## 2026-07-07

- **Fairer leaderboards** — daily results now only count toward your account when they're
  played on the actual day, so streaks and XP on the leaderboards reflect real play.
- **Tidier game headers** — the "All games" back link in Guess the Cost, Grid and
  Higher / Lower now lines up with the Daily/Endless toggle instead of sitting on its own
  row below it.
- **Roomier leaderboards** — the home-screen leaderboard now spreads across the width of the
  games hub, laying the top players out in columns of five on desktop. The full leaderboard
  page sits on its own panel so names read clearly, and is now paged through the top 100.
  Common-tier names show in plain white instead of the ember accent.
- **Pick a username to finish signing in** — new accounts now choose a name before the
  welcome screen will close; it can no longer be skipped for later.
- **Tidier account button** — a long username no longer runs over the Commandle wordmark,
  and the account button is now hidden on info pages (About, FAQ, Privacy, Changelog, the
  leaderboard, and so on) where it was crowding the title.
- **Your account page got a glow-up** — your level now wraps around your avatar as an XP
  ring, your day and win streaks are shown as big glowing tiles that warm up the longer
  your streak runs, and the whole page is tinted to your supporter rarity. The Ko-fi
  supporter frames are now laid out as rarity chips so it's clear what each tip unlocks.
  The public profile page gets the same treatment.
- **Mythic supporters now have a foil** — Mythic Rare tier avatars and names get the
  same holographic foil sweep a card gets when you guess it, drifting across every so
  often, everywhere they appear (account, account menu, leaderboard, and public profiles).
  Your rarity gem now sits beside your name in the account menu too, catching a foil glint.
- **More free avatars** — every player can now pick from the 20 most popular commanders,
  up from 5, without needing a supporter tier.
- **Supporter tier colours are now consistent everywhere** — the same uncommon, rare and
  mythic colours are used across your account, the leaderboard, and Grid mode. Your avatar
  ring in the account menu now matches your supporter tier too (rare gold, mythic orange).
- The **sign-in buttons now use the familiar Google and Discord branding** — the colour
  Google “G” on a white button and the Discord mark on their blurple button — so they look
  like the sign-in buttons you see elsewhere.
- **Fixed the sign-in menu spilling off the side of the screen on phones** — it now always
  opens fully within the viewport.
- The **results screen now shows the XP you earned** — a “+N XP” badge next to your score.
  Solving in fewer guesses earns more, and finishing a puzzle you didn’t crack still earns a
  little participation XP.
- The **account pill now sits in the masthead** (top-right, mirroring the settings cog)
  instead of floating in the corner of the screen, and it no longer vanishes after pressing
  Back.
- The **first-time welcome is now skippable** — since accounts are optional, you can dismiss
  it with “I’ll do this later,” the Escape key, or a click outside, and set your name and
  avatar whenever you like from the account page.
- The **avatar picker opens faster** — it now shows the most popular commanders first
  with a “Show all” button, instead of loading all 500 portraits at once. Searching still
  reaches every commander.
- Changing your **avatar or leaderboard visibility** now shows a clear confirmation, so you
  can tell a change actually saved. Save messages fade away on their own, and errors stick
  around so you don't miss them.
- Moved the **account pill to the top-right corner** (with the settings cog now on the
  top-left), so it no longer sits awkwardly over the logo.
- The account pill now opens a quick menu right where you are instead of sending you to a
  separate page. Signed out, you can **sign in with Google or
  Discord in one tap** and land back on the page you were on. Signed in, it drops down your
  level, XP and shortcuts to your account, the leaderboard, your public profile and sign out.

## 2026-07-06

- Fixed a crash that stopped the **account page from loading** for players who haven't
  supported the project on Ko-fi.
- Your **account is now reachable from every page** via a small avatar/name/level pill in
  the top-left corner (or a "Sign in" pill when signed out) — it's no longer tucked away in
  the footer.
- The account page's **Back** button now returns to the main page instead of retracing your
  steps (which could bounce you back through the sign-in redirect).
- Tidied a heading font on the account page so the **Supporter frame** panel matches the
  rest of the site.
- The **account and profile pages** got a visual pass: the drifting card art from the
  daily modes now floats behind them, panels sit on frosted glass instead of flat grey,
  the stat tiles use proper icons in place of emoji, and the copy reads less like a form.
  The action buttons are clearer too (a plain "View public profile" and "Sign out").
- **Supporter cosmetics** are now granted automatically from Ko-fi donations: donate
  with the same email you sign in with and your tier applies on your next login (and
  donations made before signing up are picked up too). £5 unlocks **Uncommon**, £15
  **Rare** and £20 **Mythic** (cumulative — your highest total wins). Each tier gives a
  rarity-coloured username, a set-symbol rarity gem beside your name and a matching
  avatar ring on the leaderboard and profiles.
- Free accounts again choose from **five avatars**; the full top-500 gallery is a
  supporter perk. Locked avatars show a padlock in the picker.
- Fixed the account page's **mode tabs**, which were tinted ember — unselected tabs are
  grey/white again, matching the daily pages.
- The account page's **Back** button now sits below the mode tabs instead of up in the
  masthead.

- New **Leaderboard** page (`/leaderboard`, linked from the footer and the home widget) for signed-in
  players who've opted in: tabs for day streak, best streak, win streak, XP and total
  wins, the top 100 for each, and your own rank pinned below the list if you're not on
  it. The home screen now also has a compact top-5 leaderboard widget with the same
  tabs, linking through to the full board.
- Daily wins now earn a small bonus to XP the longer your current day streak runs
  (capped at +20%), on top of the existing per-win and full-5/5-day bonuses.
- New **Account** page (`/account`, linked in the footer): sign in with Google or
  Discord, then pick your own **username** and a **commander-art avatar** (five to
  choose from, more unlocked by supporter tiers). Your account tracks your streaks,
  win streak, wins and XP across the daily modes, and you can choose whether to
  appear on the leaderboards. We take only a sign-in id and your email from Google/
  Discord — never your name or picture — and you're identified by an anonymous id.
  Accounts are entirely optional; every game still works fully without signing in.
- First sign-in now has a short welcome: name your planeswalker and pick your
  commander sigil before you land on your profile. Your profile is a proper MTG
  character sheet — a hero banner with your avatar, a level + XP bar, and stat cards
  for your streaks and wins. Change your avatar any time by clicking it to open the
  gallery, and rename yourself with the pencil.
- Avatars are chosen from a searchable five-across gallery (supporters unlock all top
  500; free accounts pick from five — see the supporter note above). Supporter tiers
  also colour your name, add a rarity gem and tint your avatar ring. The account page
  now also carries the daily **mode tabs**,
  so it sits within the rest of the site and shows which of today's puzzles you've solved.
- The "back" control on info pages (and the games) now sits neatly below the title
  instead of overlapping it, and the account page's is simply "Back".
- The Changelog and other info pages now have a "Back to today" button, and Higher/Lower,
  Guess the cost, The Binder and Grid now use the same flame-styled back button as the
  archive.
- New page: **Changelog** (`/changelog`) — a friendly, version-by-version history of
  what's been added to Commandle, with v1.0.0 as today's release. Linked from the games hub
  under Miscellaneous.
- In The Binder, found cards now read "Found {date} in {mode}" and no longer show the
  colored mode dots or the corner tick on the art. Undiscovered commanders now show in
  full-opacity grayscale instead of dimmed.
- Higher/Lower, Guess the cost, The Binder and Grid now share the "Commandle" wordmark
  in their header, with the game's name shown as a subtitle just beneath it.
- Higher/Lower, Guess the cost, The Binder and Grid now have their own settings cog
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
- Tidied the settings menu: removed the Higher/Lower and Guess the cost shortcuts
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
  Higher/Lower, Guess the cost, Grid, the Binder, and the games hub — matching the
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
  for Guess the cost, and a grid for Grid — no more identical card backs.
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

- New bonus game: **Guess the cost** (`/guess-the-cost`) — guess the daily commander's
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
