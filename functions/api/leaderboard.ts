/**
 * Public leaderboard endpoint (Phase 3, item 3).
 *
 *   GET /api/leaderboard/:metric?limit=N        → { entries: LeaderboardEntry[] }
 *   GET /api/leaderboard/:metric?limit=N&uuid=U → { entries, you? }
 *
 * Ranks only accounts that opted in AND have set a username (anonymous localStorage
 * numbers never appear here — the board is accounts-only, as specced). The sort column
 * is looked up from a fixed whitelist so `:metric` can't inject SQL. Degradable: 503
 * without D1, and the client hides the board on any failure.
 *
 * `uuid` is an optional, best-effort extra: when present and that player is ranked
 * (opted in, named, non-zero value), the response also carries `you` — their own
 * row plus rank — so the full `/leaderboard` page can highlight/point to a player
 * who didn't make the visible page. It's a personalised read, so that response isn't
 * edge-cached; the plain (no `uuid`) response still is.
 */
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

  // `col` is one of a small fixed set (never user text), so interpolating it is safe.
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
    // Community boards change slowly; let the edge cache the plain board briefly.
    return json({ entries }, 200, { "cache-control": "public, max-age=60" });
  }

  // Personalised extra: only meaningful for a valid, ranked player, and never cached.
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

// Referenced so the metric list is bundled with the worker (and tree-shaking keeps it).
export { LEADERBOARD_METRICS };
