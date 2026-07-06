import { useState } from "react";
import { GRID_SIZE, type GridPuzzle } from "../../lib/gridGame";
import { rarityScore, type GridPicks } from "../../lib/gridRarity";
import { shareOrCopy, shareOrigin } from "../../lib/share";
import { useCountdown } from "../../lib/useCountdown";
import ShareMenu, { type ShareOption } from "../ShareMenu";
import { FiType, FiZap } from "react-icons/fi";

interface Props {
  puzzle: GridPuzzle;
  puzzleNo: number;
  picks: ReadonlyArray<string | null>;
  community: GridPicks | null;
}

/** Post-game summary: rarity score (when the community backend answers) + share menu. */
export default function GridResult({ puzzleNo, picks, community }: Props) {
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const countdown = useCountdown();
  const filled = picks.filter((p) => p != null).length;
  const score = community && community.total > 0 ? rarityScore(community, picks) : null;

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

  const heading = `Commandle Grid #${puzzleNo} — ${filled}/9`;
  const link = `${shareOrigin()}/grid?from=share`;

  const share = () => {
    const text = [
      heading,
      emojiGrid(),
      ...(score != null ? [`Rarity score: ${score}`] : []),
      link,
    ].join("\n");
    shareOrCopy(text).then(() => flash(setCopied), () => {});
  };

  const challenge = () => {
    const text = [
      `I filled ${filled}/9 on today's Commandle Grid #${puzzleNo} — think you can do better?`,
      link,
    ].join("\n");
    shareOrCopy(text).then(() => flash(setChallenged), () => {});
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
        {filled === 9 ? "Immaculate! All nine cells." : `You filled ${filled} of 9 cells.`}
      </p>
      {score != null ? (
        <p className="grid-result-rarity">
          Rarity score: <strong>{score}</strong>
          <span className="grid-result-sub">
            {" "}
            (sum of pick rates — lower is rarer · {community!.total} player
            {community!.total === 1 ? "" : "s"})
          </span>
        </p>
      ) : (
        <p className="grid-result-sub">Community pick rates unavailable right now.</p>
      )}
      <div className="grid-result-share">
        <ShareMenu options={options} />
      </div>
      <p className="result-countdown">
        Next grid in <strong>{countdown}</strong>
      </p>
    </div>
  );
}
