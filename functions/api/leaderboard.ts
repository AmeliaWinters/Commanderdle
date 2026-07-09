import {
  LEADERBOARD_METRICS,
  metricByKey,
  type LeaderboardEntry,
  type LeaderboardYou,
} from "../../src/lib/leaderboard";
import { EFFECTIVE_TIER_SQL } from "./webhooks/kofi";
import { canChooseNameColor } from "../../src/lib/avatars";

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

interface Row {
  uuid: string;
  username: string;
  avatar: string;
  tier: string;
  name_color: string | null;
  value: number;
}

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

export async function onLeaderboard(
  request: Request,
  env: Env,
  metricKey: string,
): Promise<Response> {
  const metric = metricByKey(metricKey);
  if (!metric) return json({ error: "unknown metric" }, 404);
  if (!env.STATS_DB) return json({ error: "leaderboard unavailable" }, 503);

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 100, 1),
    100,
  );

  const col = metric.column;
  const { results } = await env.STATS_DB.prepare(
    `SELECT u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.name_color, s.${col} AS value
     FROM user_stats s JOIN users u ON u.id = s.user_id
     WHERE u.leaderboard_opt_in = 1 AND u.username IS NOT NULL AND s.${col} > 0
     ORDER BY s.${col} DESC, s.updated_at ASC
     LIMIT ?`,
  )
    .bind(limit)
    .all<Row>();

  const toEntry = (r: Row): LeaderboardEntry => {
    const tier = (
      ["uncommon", "rare", "mythic", "theCreator"].includes(r.tier)
        ? r.tier
        : "common"
    ) as LeaderboardEntry["tier"];
    return {
      uuid: r.uuid,
      username: r.username,
      avatar: r.avatar,
      tier,
      nameColor: canChooseNameColor(tier) ? (r.name_color ?? null) : null,
      value: r.value,
    };
  };

  const entries: LeaderboardEntry[] = (results ?? []).map(toEntry);

  const uuidParam = url.searchParams.get("uuid");
  if (!uuidParam) {
    return json({ entries }, 200, { "cache-control": "public, max-age=60" });
  }

  let you: LeaderboardYou | undefined;
  if (UUID_RE.test(uuidParam)) {
    const meRow = await env.STATS_DB.prepare(
      `SELECT u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.name_color, s.${col} AS value
       FROM user_stats s JOIN users u ON u.id = s.user_id
       WHERE u.uuid = ? AND u.leaderboard_opt_in = 1 AND u.username IS NOT NULL AND s.${col} > 0`,
    )
      .bind(uuidParam)
      .first<Row>();

    if (meRow) {
      const rankRow = await env.STATS_DB.prepare(
        `SELECT COUNT(*) AS n
         FROM user_stats s JOIN users u ON u.id = s.user_id
         WHERE u.leaderboard_opt_in = 1 AND u.username IS NOT NULL AND s.${col} > ?`,
      )
        .bind(meRow.value)
        .first<{ n: number }>();
      you = { ...toEntry(meRow), rank: (rankRow?.n ?? 0) + 1 };
    }
  }

  return json({ entries, you }, 200, { "cache-control": "private, no-store" });
}

export { LEADERBOARD_METRICS };
