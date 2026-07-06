import { useMemo } from "react";
import { cellCriteria, cellAnswers, type GridPuzzle } from "../../lib/gridGame";
import {
  pickPct,
  tierForPct,
  TIER_LABELS,
  type GridPicks,
  type GuessTier,
} from "../../lib/gridRarity";
import { gridPool } from "../../lib/commanders";
import CardZoom from "../CardZoom";
import RarityGem from "./RarityGem";

interface Props {
  puzzle: GridPuzzle;
  cell: number;
  /** What the player put here (highlighted in the list), if anything. */
  pick: string | null;
  /** Community pick rates, once loaded (post-game only). */
  community: GridPicks | null;
  onClose: () => void;
}

interface AnswerRow {
  name: string;
  artCrop: string | null;
  /** Full-size card image for the hover/tap zoom. */
  image: string | null;
  rank: number;
  /** % of all players who put this commander here (out of everyone who played). */
  pct: number | null;
  /** MTG rarity this answer's pick rate maps to (null when there's no community data). */
  tier: GuessTier | null;
}

/**
 * Post-game "who else fit here" reveal: every valid answer for a cell, ranked by how
 * many players picked it, with the community pick rate for each (share of everyone who
 * played the puzzle, not just those who filled this cell).
 */
export default function GridCellDetail({
  puzzle,
  cell,
  pick,
  community,
  onClose,
}: Props) {
  const [row, col] = cellCriteria(puzzle, cell);

  const answers = useMemo<AnswerRow[]>(() => {
    const rows = cellAnswers(puzzle, cell, gridPool()).map((c) => {
      const pct = pickPct(community, cell, c.name);
      return {
        name: c.name,
        artCrop: c.artCrop,
        image: c.normalImage ?? c.artCrop,
        rank: c.rank,
        pct,
        tier: pct == null ? null : tierForPct(pct),
      };
    });
    // Most-picked first; ties (and the no-data case) fall back to popularity rank.
    rows.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || a.rank - b.rank);
    return rows;
  }, [puzzle, cell, community]);

  const hasRates = community != null && community.total > 0;

  return (
    <div
      className="grid-search-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="grid-detail" onClick={(e) => e.stopPropagation()}>
        <div className="grid-search-head">
          <span className="grid-search-prompt">
            {row.label} + {col.label}
          </span>
          <button
            className="grid-search-close"
            aria-label="Close"
            onClick={onClose}
          >
            X
          </button>
        </div>
        <p className="grid-detail-count">
          {answers.length} valid answer{answers.length === 1 ? "" : "s"}
          {hasRates ? " · % of all players who picked each" : ""}
        </p>
        <ul className="grid-detail-list">
          {answers.map((a) => (
            <CardZoom
              name={a.name}
              image={a.image}
              className="grid-detail-zoom"
            >
              <li
                key={a.name}
                className={`grid-detail-item${a.name === pick ? " grid-detail-item-mine" : ""}`}
              >
                {a.artCrop ? (
                  <img
                    className="grid-detail-thumb"
                    src={a.artCrop}
                    alt=""
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span
                    className="grid-detail-thumb grid-detail-thumb-blank"
                    aria-hidden="true"
                  />
                )}

                <span className="ac-name">{a.name}</span>
                {a.name === pick && (
                  <span className="grid-detail-you">your pick</span>
                )}
                {a.tier && (
                  <span
                    className={`grid-detail-tier grid-detail-tier-${a.tier}`}
                    title={`${TIER_LABELS[a.tier]} — ${a.pct}% of players picked this`}
                  >
                    <RarityGem tier={a.tier} size={13} />
                    <span className="grid-detail-tier-label">
                      {TIER_LABELS[a.tier]}
                    </span>
                  </span>
                )}
                {a.pct != null && (
                  <span
                    className={`grid-detail-pct${a.pct <= 5 ? " grid-detail-pct-rare" : ""}`}
                  >
                    {a.pct}%
                  </span>
                )}
              </li>
            </CardZoom>
          ))}
        </ul>
      </div>
    </div>
  );
}
