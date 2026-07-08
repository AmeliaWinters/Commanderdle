import type { GridPuzzle } from "../../lib/gridGame";
import { GRID_SIZE } from "../../lib/gridGame";
import {
  pickPct,
  tierForPct,
  type GridPicks,
  type GuessTier,
} from "../../lib/gridRarity";
import { COMMANDERS_BY_NAME, EXT_COMMANDERS } from "../../lib/commanders";
import RarityGem from "./RarityGem";
import ManaCost from "../ManaSymbols";
import type { GridCriterion } from "../../lib/gridGame";

/** Header content for a criterion: label, plus WUBRG mana pips for color identities. */
function CriterionHead({ criterion }: { criterion: GridCriterion }) {
  const colors = criterion.id.startsWith("color:")
    ? criterion.id.slice("color:".length).split("")
    : null;
  return (
    <>
      {criterion.label}
      {colors && (
        <ManaCost colors={colors} size="0.9em" />
      )}
    </>
  );
}

interface Props {
  puzzle: GridPuzzle;
  picks: ReadonlyArray<string | null>;
  /** Rarity tier each pick earned at guess time (null = unrated or unfilled). */
  tiers: ReadonlyArray<GuessTier | null>;
  done: boolean;
  /** Community pick rates, once loaded (post-game only). */
  community: GridPicks | null;
  /** Cell index the player is currently filling, for the active highlight. */
  selected: number | null;
  onSelect: (cell: number) => void;
}

/** Resolve a picked name to its art, checking the extended tail too. */
function artFor(name: string): string | null {
  const core = COMMANDERS_BY_NAME.get(name);
  if (core) return core.artCrop;
  return EXT_COMMANDERS.find((c) => c.name === name)?.artCrop ?? null;
}

/** The 3×3 play surface: criteria headers on both axes, one button per cell. */
export default function GridBoard({
  puzzle,
  picks,
  tiers,
  done,
  community,
  selected,
  onSelect,
}: Props) {
  return (
    <div className="grid-board" role="grid" aria-label="Commander grid">
      <div className="grid-corner" aria-hidden="true" />
      {puzzle.cols.map((col) => (
        <div key={col.id} className="grid-head grid-head-col" role="columnheader">
          <CriterionHead criterion={col} />
        </div>
      ))}
      {puzzle.rows.map((row, r) => (
        <div key={row.id} className="grid-row" role="row">
          <div className="grid-head grid-head-row" role="rowheader">
            <CriterionHead criterion={row} />
          </div>
          {puzzle.cols.map((_, c) => {
            const cell = r * GRID_SIZE + c;
            const name = picks[cell];
            const pct = name != null ? pickPct(community, cell, name) : null;
            const art = name != null ? artFor(name) : null;
            // Rarity earned at guess time; once community data lands post-game, the
            // final pick-rate wins so the gem matches the % shown on the cell.
            const tier: GuessTier | null =
              name == null
                ? null
                : pct != null
                  ? tierForPct(pct)
                  : tiers[cell] ?? null;
            return (
              <button
                key={cell}
                className={`grid-cell ${name ? "grid-cell-filled" : ""} ${
                  tier ? `grid-cell-${tier}` : ""
                } ${selected === cell ? "grid-cell-active" : ""} ${
                  done && !name ? "grid-cell-missed" : ""
                }`}
                role="gridcell"
                // While playing, only empty cells are clickable (to fill them). Once the
                // grid is done, every cell opens its "who else fit here" reveal.
                disabled={!done && name != null}
                onClick={() => onSelect(cell)}
                aria-label={`${puzzle.rows[r].label} and ${puzzle.cols[c].label}${
                  name ? `: ${name}` : ""
                }${done ? ", show all answers" : ""}`}
              >
                {name ? (
                  <>
                    {art && <img src={art} alt="" className="grid-cell-art" />}
                    <span className="grid-cell-name">
                      {tier && (
                        <RarityGem tier={tier} className="grid-cell-gem" />
                      )}
                      {name}
                    </span>
                    {pct != null && (
                      <span
                        className={`grid-cell-pct ${pct <= 5 ? "grid-cell-pct-rare" : ""}`}
                        title={`${pct}% of players picked this`}
                      >
                        {pct}%
                      </span>
                    )}
                  </>
                ) : done ? (
                  <span className="grid-cell-x" aria-hidden="true">
                    ✕
                  </span>
                ) : (
                  <span className="grid-cell-plus" aria-hidden="true">
                    +
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
