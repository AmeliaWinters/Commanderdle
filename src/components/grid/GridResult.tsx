import { useState } from "react";
import { GRID_SIZE, type GridPuzzle } from "../../lib/gridGame";
import {
  rarityScore,
  tierScore,
  guessTier,
  TIER_LABELS,
  type GridPicks,
  type GuessTier,
} from "../../lib/gridRarity";
import { shareOrCopy, shareOrigin } from "../../lib/share";
import { useCountdown } from "../../lib/useCountdown";
import ShareMenu, { type ShareOption } from "../ShareMenu";
import RarityGem from "./RarityGem";
import { FiType, FiZap } from "react-icons/fi";

interface Props {
  puzzle: GridPuzzle;
  puzzleNo: number;
  picks: ReadonlyArray<string | null>;
  /** Rarity tier each pick earned at guess time (null = unrated or unfilled). */
  tiers: ReadonlyArray<GuessTier | null>;
  community: GridPicks | null;
}

/** Post-game summary: rarity score (when the community backend answers) + share menu. */
export default function GridResult({
  puzzleNo,
  picks,
  tiers,
  community,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const countdown = useCountdown();
  const filled = picks.filter((p) => p != null).length;
  const score =
    community && community.total > 0 ? rarityScore(community, picks) : null;

  // Prefer the final community pick-rate for the tier (so it matches the % shown on
  // the board); fall back to the tier locked in at guess time. Every filled cell
  // scores something — a card nobody else picked is a Mythic Rare.
  const finalTiers: Array<GuessTier | null> = picks.map((name, cell) =>
    name == null
      ? null
      : community
        ? guessTier(community, cell, name)
        : (tiers[cell] ?? guessTier(null, cell, name)),
  );
  const points = tierScore(finalTiers);
  const tierCounts = (["mythic", "rare", "uncommon", "common"] as const)
    .map((t) => [t, finalTiers.filter((x) => x === t).length] as const)
    .filter(([, n]) => n > 0);

  const flash = (set: (v: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 2000);
  };

  function emojiGrid(): string {
    const rows: string[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      rows.push(
        picks
          .slice(r * GRID_SIZE, (r + 1) * GRID_SIZE)
          .map((p) => (p ? "🟩" : "⬜"))
          .join(""),
      );
    }
    return rows.join("\n");
  }

  const heading = `Commandle Grid #${puzzleNo}: ${filled}/9`;
  const link = `${shareOrigin()}/grid?from=share`;

  const share = () => {
    const text = [
      heading,
      emojiGrid(),
      ...(points > 0 ? [`Score: ${points} pts`] : []),
      ...(score != null ? [`Rarity score: ${score}`] : []),
      link,
    ].join("\n");
    shareOrCopy(text).then(
      () => flash(setCopied),
      () => {},
    );
  };

  const challenge = () => {
    const text = [
      `I filled ${filled}/9 on today's Commandle Grid #${puzzleNo}. Think you can do better?`,
      link,
    ].join("\n");
    shareOrCopy(text).then(
      () => flash(setChallenged),
      () => {},
    );
  };

  const options: ShareOption[] = [
    {
      key: "text",
      label: "Share as text",
      hint: "Emoji grid + link",
      icon: <FiType aria-hidden="true" />,
      done: copied ? "Copied!" : null,
      onSelect: share,
    },
    {
      key: "challenge",
      label: "Challenge a friend",
      hint: "Dare them to beat you",
      icon: <FiZap aria-hidden="true" />,
      done: challenged ? "Copied!" : null,
      onSelect: challenge,
    },
  ];

  return (
    <div className="grid-result">
      <p className="grid-result-line">
        {filled === 9
          ? "Immaculate! All nine cells."
          : `You filled ${filled} of 9 cells.`}
      </p>
      {tierCounts.length > 0 && (
        <>
          <p className="grid-result-score">
            Score: <strong>{points}</strong> pts
          </p>
          <ul className="grid-result-tiers">
            {tierCounts.map(([t, n]) => (
              <li key={t} className={`grid-result-tier grid-result-tier-${t}`}>
                <RarityGem tier={t} size={15} />
                {n}× {TIER_LABELS[t]}
              </li>
            ))}
          </ul>
        </>
      )}
      {score != null ? (
        <p className="grid-result-rarity">
          Rarity score: <strong>{score}</strong>
          <span className="grid-result-sub">
            {" "}
            (sum of pick rates, lower is rarer · {community!.total} player
            {community!.total === 1 ? "" : "s"})
          </span>
        </p>
      ) : (
        <p className="grid-result-sub">
          Community pick rates unavailable right now.
        </p>
      )}
      <p className="grid-result-hint">
        Tap any cell above to see every commander that fits the criteria, and
        how rare each answer is.
      </p>
      <div className="grid-result-share">
        <ShareMenu options={options} />
      </div>
      <p className="result-countdown">
        Next grid in <strong>{countdown}</strong>
      </p>
    </div>
  );
}
