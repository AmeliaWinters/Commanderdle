import AvatarImage from "../AvatarImage";
import { TIER_META, tierNameDisplay } from "../../lib/auth";
import { profilePath, navigateToPath } from "../../lib/router";
import type { LeaderboardEntry, LeaderboardYou } from "../../lib/leaderboard";

interface Props {
  entries: LeaderboardEntry[];
  /** Rank number of the first entry (for paged lists). Defaults to 1. */
  startRank?: number;
  unit?: string;
  /** Highlight the signed-in player's own row. */
  meUuid?: string | null;
  /**
   * The signed-in player's own rank, when they're ranked but not among `entries`
   * (e.g. outside the top 100). Rendered as a separated row below the list.
   */
  you?: LeaderboardYou;
}

/** Rank badge: gold / silver / bronze for the podium, plain otherwise. */
function rankClass(i: number): string {
  return i < 3 ? ` lb-rank-${i + 1}` : "";
}

function Row({
  rank,
  entry,
  unit,
  isMe,
}: {
  rank: number;
  entry: LeaderboardEntry;
  unit?: string;
  isMe: boolean;
}) {
  const tier = TIER_META[entry.tier];
  const nameDisp = tierNameDisplay(entry.tier, entry.nameColor);
  return (
    <a
      href={profilePath(entry.uuid)}
      className={`lb-row${isMe ? " lb-me" : ""}`}
      onClick={(ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        navigateToPath(profilePath(entry.uuid));
      }}
    >
      <span className={`lb-rank${rankClass(rank - 1)}`}>{rank}</span>
      <AvatarImage
        avatar={entry.avatar}
        size={36}
        foil={entry.tier === "mythic"}
      />
      <span
        className={`lb-name${nameDisp.foil ? " foil-text" : ""}`}
        style={nameDisp.color ? { color: nameDisp.color } : undefined}
      >
        {entry.username}
        {entry.tier !== "common" && (
          <i
            className={`${tier.keyrune} lb-gem`}
            role="img"
            aria-label={tier.label}
            title={tier.label}
          />
        )}
      </span>
      <span className="lb-value">
        {entry.value.toLocaleString()}
        {unit && <span className="lb-unit"> {unit}</span>}
      </span>
    </a>
  );
}

/** The ranked rows shared by the home widget and the full leaderboard page. */
export default function LeaderboardList({
  entries,
  startRank = 1,
  unit,
  meUuid,
  you,
}: Props) {
  const showYou = you && !entries.some((e) => e.uuid === you.uuid);
  return (
    <>
      <ol className="lb-list" start={startRank}>
        {entries.map((e, i) => (
          <li key={e.uuid}>
            <Row
              rank={startRank + i}
              entry={e}
              unit={unit}
              isMe={e.uuid === meUuid}
            />
          </li>
        ))}
      </ol>
      {showYou && you && (
        <>
          <p className="lb-you-divider" aria-hidden="true">
            ...
          </p>
          <ol className="lb-list lb-you-list">
            <li>
              <Row rank={you.rank} entry={you} unit={unit} isMe />
            </li>
          </ol>
        </>
      )}
    </>
  );
}
