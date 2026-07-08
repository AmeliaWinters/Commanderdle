/**
 * Shared leaderboard definitions (Phase 3, item 3). Pure — imported by both the
 * Worker (to whitelist the sort column, so `:metric` can never inject SQL) and the
 * client (to render the metric tabs). Values come from the `user_stats` table.
 */

export interface MetricDef {
  /** URL slug + client key. */
  key: string;
  /** Short tab label. */
  label: string;
  /** Column in `user_stats` this metric ranks by (whitelisted server-side). */
  column: string;
  /** Tiny unit shown after the value on the board. */
  unit?: string;
}

export const LEADERBOARD_METRICS: MetricDef[] = [
  { key: "current-streak", label: "Day streak", column: "play_streak" },
  { key: "max-streak", label: "Best streak", column: "max_play_streak" },
  { key: "current-win-streak", label: "Win streak", column: "win_streak" },
  { key: "xp", label: "XP", column: "xp", unit: "xp" },
  { key: "wins", label: "Wins", column: "total_wins" },
];

export const DEFAULT_METRIC = "current-streak";

export function metricByKey(key: string): MetricDef | undefined {
  return LEADERBOARD_METRICS.find((m) => m.key === key);
}

export type Tier = "common" | "uncommon" | "rare" | "mythic" | "theCreator";

/** One ranked row on the board. */
export interface LeaderboardEntry {
  uuid: string;
  username: string;
  avatar: string;
  tier: Tier;
  /** Custom flare colour (mythic+), or null for the tier default. */
  nameColor: string | null;
  value: number;
}

/** The requesting player's own placement, included even when off the visible page. */
export interface LeaderboardYou extends LeaderboardEntry {
  rank: number;
}

/** A shareable public profile (see functions/api/profile.ts). */
export interface PublicProfile {
  uuid: string;
  username: string;
  avatar: string;
  tier: Tier;
  /** Custom flare colour (mythic+), or null for the tier default. */
  nameColor: string | null;
  joinedAt: number;
  stats: import("./accountStats").AccountStats;
}
