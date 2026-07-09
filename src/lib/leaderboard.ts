
export interface MetricDef {
  key: string;
  label: string;
  column: string;
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

export interface LeaderboardEntry {
  uuid: string;
  username: string;
  avatar: string;
  tier: Tier;
  nameColor: string | null;
  value: number;
}

export interface LeaderboardYou extends LeaderboardEntry {
  rank: number;
}

export interface PublicProfile {
  uuid: string;
  username: string;
  avatar: string;
  tier: Tier;
  nameColor: string | null;
  joinedAt: number;
  stats: import("./accountStats").AccountStats;
  bonusStats?: Record<
    import("./bonusStreakMath").BonusMode,
    import("./bonusStreakMath").BonusStreaks
  >;
  binderCount?: number;
}
