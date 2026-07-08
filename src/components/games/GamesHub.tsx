import { useEffect, useMemo } from "react";
import type { ComponentType, CSSProperties } from "react";
import { FaCheck } from "react-icons/fa6";
import { TbArrowsUpDown, TbCoin, TbBook, TbHistory } from "react-icons/tb";
import { BsGrid3X3 } from "react-icons/bs";
import { MODE_LIST } from "../modeList";
import type { Mode } from "../../types/commander";
import {
  MODE_PATHS,
  HIGHER_LOWER_PATH,
  PRICE_IS_RIGHT_PATH,
  GRID_PATH,
  BINDER_PATH,
  CHANGELOG_PATH,
  navigateToPath,
} from "../../lib/router";
import { COMMANDERS } from "../../lib/commanders";
import { loadCollection } from "../../lib/collection";
import { isModeCompletedToday } from "../../lib/stats";
import { todayKey, hashString, dailyAnswer } from "../../lib/dailyAnswer";
import CardBackdrop from "../CardBackdrop";
import LogoTitle from "../layout/LogoTitle";
import AppFooter from "../layout/AppFooter";
import AccountWidget from "../layout/AccountWidget";
import LeaderboardWidget from "../leaderboard/LeaderboardWidget";

const MODE_BLURBS: Record<Mode, string> = {
  classic: "Deduce the commander from clues",
  synergy: "Guess it from its highest synergy cards",
  silhouette: "Guess it from a blur of its art",
  zoom: "Guess it from a crop that widens",
  quote: "Guess it from its flavor text",
};

/** One mana colour per daily mode, flavour-matched: order/rules = W, growth
 * and packs = G, shadow = B, scrying detail = U, passion and flavor = R. */
const MODE_PIP: Record<Mode, string> = {
  classic: "W",
  synergy: "U",
  silhouette: "B",
  zoom: "R",
  quote: "G",
};

/** Bonus games: each gets a glyph that hints at how it plays and its own accent. */
const GAMES: {
  path: string;
  label: string;
  blurb: string;
  Icon: ComponentType;
  accent: string;
}[] = [
  {
    path: HIGHER_LOWER_PATH,
    label: "Higher / Lower",
    blurb: "Which commander is in more decks?",
    Icon: TbArrowsUpDown,
    accent: "#4e91c9",
  },
  {
    path: PRICE_IS_RIGHT_PATH,
    label: "Guess the cost",
    blurb: "Guess the card's market price",
    Icon: TbCoin,
    accent: "#d9a441",
  },
  {
    path: GRID_PATH,
    label: "Grid",
    blurb: "Fill a 3x3 of criteria with commanders",
    Icon: BsGrid3X3,
    accent: "#4c9a63",
  },
];

/**
 * A commander art-crop to decorate each daily-mode tile: seeded per mode per
 * day so everyone sees the same gallery, and never that mode's actual daily
 * answer (the art itself would spoil Silhouette/Zoom).
 */
function tileArt(mode: Mode): string | null {
  if (COMMANDERS.length === 0) return null;
  const answer = dailyAnswer(mode).name;
  let idx = hashString(`hub-art:${mode}:${todayKey()}`) % COMMANDERS.length;
  for (let hops = 0; hops < COMMANDERS.length; hops++) {
    const c = COMMANDERS[idx];
    if (c.artCrop && c.name !== answer) return c.artCrop;
    idx = (idx + 1) % COMMANDERS.length;
  }
  return null;
}

function tileClick(path: string) {
  return (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    navigateToPath(path);
  };
}

/** The Binder — its own panel, separate from the bonus games. */
function BinderSection() {
  const found = useMemo(() => {
    const col = loadCollection();
    return COMMANDERS.filter((c) => col[c.name]).length;
  }, []);
  return (
    <section className="hub-col hub-col-binder" aria-labelledby="hub-binder">
      <h2 id="hub-binder">Miscellaneous</h2>

      <a
        href={BINDER_PATH}
        className="hub-tile hub-tile-game"
        style={{ "--tile-accent": "#c9a24e" } as CSSProperties}
        onClick={tileClick(BINDER_PATH)}
      >
        <span className="hub-tile-icon" aria-hidden="true">
          <TbBook />
        </span>
        <span className="hub-tile-text">
          <span className="hub-tile-label">The Binder </span>
          <span className="hub-tile-blurb">
            Commanders you've found in the dailies. You've collected {found} of{" "}
            {COMMANDERS.length} commanders
          </span>
        </span>
      </a>

      <a
        href={CHANGELOG_PATH}
        className="hub-tile hub-tile-game"
        style={{ "--tile-accent": "#8a7fb5" } as CSSProperties}
        onClick={tileClick(CHANGELOG_PATH)}
      >
        <span className="hub-tile-icon" aria-hidden="true">
          <TbHistory />
        </span>
        <span className="hub-tile-text">
          <span className="hub-tile-label">Changelog</span>
          <span className="hub-tile-blurb">What's new, version by version</span>
        </span>
      </a>
    </section>
  );
}

/** Title screen: every way to play - daily modes left, bonus games right. */
export default function GamesHub() {
  useEffect(() => {
    document.title = "Commandle - Daily MTG Commander Guessing Games";
  }, []);
  const today = todayKey();
  const art = useMemo(
    () =>
      Object.fromEntries(MODE_LIST.map((m) => [m.id, tileArt(m.id)])) as Record<
        Mode,
        string | null
      >,
    [],
  );

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header hub-header">
        <AccountWidget />
        <LogoTitle ariaLabel="commandle">
          Comman<span className="accent">dle</span>
        </LogoTitle>
        <p className="tagline">Pick your battlefield, planeswalker</p>
      </header>

      <main className="play-area hub-area">
        <div className="hub-columns">
          <section className="hub-col" aria-labelledby="hub-daily">
            <h2 id="hub-daily">Daily Games</h2>
            {MODE_LIST.map((m) => {
              const completed = isModeCompletedToday(m.id, today);
              return (
                <a
                  key={m.id}
                  href={MODE_PATHS[m.id]}
                  className={`hub-tile hub-tile-${MODE_PIP[m.id].toLowerCase()}`}
                  onClick={tileClick(MODE_PATHS[m.id])}
                >
                  {art[m.id] && (
                    <span
                      className="hub-tile-art"
                      style={{ backgroundImage: `url("${art[m.id]}")` }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="hub-tile-icon" aria-hidden="true">
                    <m.Icon />
                  </span>
                  <span className="hub-tile-text">
                    <span className="hub-tile-label">{m.label}</span>
                    <span className="hub-tile-blurb">{MODE_BLURBS[m.id]}</span>
                  </span>
                  <img
                    className="hub-tile-pip"
                    src={`/mana/${MODE_PIP[m.id]}.svg`}
                    alt=""
                    aria-hidden="true"
                  />
                  {completed && (
                    <span
                      className="hub-tile-done"
                      title="Completed today"
                      aria-label="Completed today"
                    >
                      <FaCheck />
                    </span>
                  )}
                </a>
              );
            })}
          </section>
          <div className="hub-col-container">
            <section className="hub-col" aria-labelledby="hub-games">
              <h2 id="hub-games">Bonus Games</h2>
              {GAMES.map((g) => (
                <a
                  key={g.path}
                  href={g.path}
                  className="hub-tile hub-tile-game"
                  style={{ "--tile-accent": g.accent } as CSSProperties}
                  onClick={tileClick(g.path)}
                >
                  <span className="hub-tile-icon" aria-hidden="true">
                    <g.Icon />
                  </span>
                  <span className="hub-tile-text">
                    <span className="hub-tile-label">{g.label}</span>
                    <span className="hub-tile-blurb">{g.blurb}</span>
                  </span>
                </a>
              ))}
            </section>
            <BinderSection />
          </div>
        </div>

        <LeaderboardWidget />
      </main>

      <AppFooter isArchive={false} />
    </div>
  );
}
