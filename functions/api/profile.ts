/**
 * Public profile endpoint (Phase 3, item 3).
 *
 *   GET /api/profile/:uuid   → { profile }  |  404
 *
 *   GET /api/profile/:uuid/binder → { binder }   |  404
 *
 * A shareable, read-only view of a named account: username, avatar, supporter tier +
 * flare, join date, leaderboard stats, bonus-game streaks and binder progress. Only
 * accounts that have set a username are visible (unnamed/first-login accounts 404).
 * Degradable: 503 without D1.
 */
import type { PublicProfile } from "../../src/lib/leaderboard";
import { EFFECTIVE_TIER_SQL } from "./webhooks/kofi";
import { canChooseNameColor } from "../../src/lib/avatars";
import { getBinder, getBonusStats } from "./account/store";

interface Env {
  STATS_DB?: D1Database;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const json = (
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });

export async function onProfile(
  _request: Request,
  env: Env,
  uuid: string,
): Promise<Response> {
  if (!env.STATS_DB) return json({ error: "profiles unavailable" }, 503);
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return json({ error: "bad id" }, 400);

  const row = await env.STATS_DB.prepare(
    `SELECT u.id, u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.name_color, u.created_at,
            s.play_streak, s.max_play_streak, s.win_streak, s.max_win_streak, s.total_wins, s.xp, s.streak_freezes
     FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
     WHERE u.uuid = ? AND u.username IS NOT NULL`,
  )
    .bind(uuid)
    .first<{
      id: number;
      uuid: string;
      username: string;
      avatar: string;
      tier: string;
      name_color: string | null;
      created_at: number;
      play_streak: number | null;
      max_play_streak: number | null;
      win_streak: number | null;
      max_win_streak: number | null;
      total_wins: number | null;
      xp: number | null;
      streak_freezes: number | null;
    }>();

  if (!row) return json({ error: "not found" }, 404);

  const tier = (
    ["uncommon", "rare", "mythic", "theCreator"].includes(row.tier)
      ? row.tier
      : "common"
  ) as PublicProfile["tier"];

  // Bonus streaks + binder size in one round of parallel reads; both are derived from
  // the player's own recorded results, so there's nothing private here.
  const [bonusStats, binder] = await Promise.all([
    getBonusStats(env.STATS_DB, row.id),
    getBinder(env.STATS_DB, row.id),
  ]);

  const profile: PublicProfile = {
    uuid: row.uuid,
    username: row.username,
    avatar: row.avatar,
    tier,
    // Only expose a custom colour while the tier still qualifies for it.
    nameColor: canChooseNameColor(tier) ? (row.name_color ?? null) : null,
    joinedAt: row.created_at,
    stats: {
      playStreak: row.play_streak ?? 0,
      maxPlayStreak: row.max_play_streak ?? 0,
      winStreak: row.win_streak ?? 0,
      maxWinStreak: row.max_win_streak ?? 0,
      totalWins: row.total_wins ?? 0,
      xp: row.xp ?? 0,
      streakFreezes: row.streak_freezes ?? 0,
    },
    bonusStats,
    binderCount: Object.keys(binder).length,
  };
  return json({ profile }, 200, { "cache-control": "public, max-age=30" });
}

/**
 * A named player's public binder — the same server-derived collection their own
 * /binder page shows, keyed by commander name. Read-only and derived purely from
 * recorded daily wins, so it's safe to expose alongside the profile.
 */
export async function onProfileBinder(
  _request: Request,
  env: Env,
  uuid: string,
): Promise<Response> {
  if (!env.STATS_DB) return json({ error: "profiles unavailable" }, 503);
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid)) return json({ error: "bad id" }, 400);

  const row = await env.STATS_DB.prepare(
    `SELECT id FROM users WHERE uuid = ? AND username IS NOT NULL`,
  )
    .bind(uuid)
    .first<{ id: number }>();
  if (!row) return json({ error: "not found" }, 404);

  const binder = await getBinder(env.STATS_DB, row.id);
  return json({ binder }, 200, { "cache-control": "public, max-age=60" });
}
