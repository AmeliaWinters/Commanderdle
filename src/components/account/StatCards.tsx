import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { FaFire, FaCrown, FaTrophy, FaBolt, FaGem, FaStar } from "react-icons/fa6";
import type { AccountStats } from "../../lib/accountStats";
import { useCountUp } from "../../lib/useCountUp";

interface Card {
  key: keyof AccountStats;
  label: string;
  Icon: IconType;
}

const FEATURED: Card[] = [
  { key: "playStreak", label: "Day streak", Icon: FaFire },
  { key: "winStreak", label: "Win streak", Icon: FaCrown },
];

const SECONDARY: Card[] = [
  { key: "totalWins", label: "Total wins", Icon: FaTrophy },
  { key: "maxPlayStreak", label: "Best streak", Icon: FaBolt },
  { key: "maxWinStreak", label: "Best win streak", Icon: FaGem },
  { key: "xp", label: "Total XP", Icon: FaStar },
];

function StatValue({ value }: { value: number }) {
  return <span className="account-stat-value">{useCountUp(value).toLocaleString()}</span>;
}

function FeaturedCard({
  card,
  value,
  sub,
}: {
  card: Card;
  value: number;
  sub?: string;
}) {
  const { Icon, label } = card;
  const glow = Math.min(1, value / 14);
  return (
    <div
      className={`account-stat account-stat-featured${value > 0 ? " is-active" : ""}`}
      style={{ "--glow": glow } as CSSProperties}
    >
      <Icon className="account-stat-watermark" aria-hidden="true" />
      <span className="account-stat-icon" aria-hidden="true">
        <Icon />
      </span>
      <StatValue value={value} />
      <span className="account-stat-label">{label}</span>
      {sub !== undefined && <span className="account-stat-sub">{sub}</span>}
    </div>
  );
}

function SecondaryCard({ card, value }: { card: Card; value: number }) {
  const { Icon, label } = card;
  return (
    <div className="account-stat">
      <span className="account-stat-icon" aria-hidden="true">
        <Icon />
      </span>
      <StatValue value={value} />
      <span className="account-stat-label">{label}</span>
    </div>
  );
}

export default function StatCards({ stats }: { stats: AccountStats }) {
  return (
    <div className="account-stats">
      <div className="account-stats-featured">
        {FEATURED.map((card) => (
          <FeaturedCard
            key={card.key}
            card={card}
            value={stats[card.key]}
            sub={
              card.key === "playStreak"
                ?
                  `❄ ${(stats.streakFreezes ?? 0).toLocaleString()} freeze${(stats.streakFreezes ?? 0) === 1 ? "" : "s"} banked`
                : undefined
            }
          />
        ))}
      </div>
      <div className="account-stats-secondary">
        {SECONDARY.map((card) => (
          <SecondaryCard key={card.key} card={card} value={stats[card.key]} />
        ))}
      </div>
    </div>
  );
}
