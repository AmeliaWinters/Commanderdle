import { metricByKey, type LeaderboardEntry } from "../../src/lib/leaderboard";
import { EFFECTIVE_TIER_SQL } from "./webhooks/kofi";
import { canChooseNameColor } from "../../src/lib/avatars";
import { currentUserRow, type AuthEnv, type UserRow } from "./auth/session";
import { rateLimitOk } from "./rateLimit";
import { resolveSend } from "../../src/lib/friendsFlow";
import { utcMidnight } from "../../src/lib/puzzleDate";

const MAX_FRIENDS = 200;
const MAX_OUTGOING = 50;
const SEND_LIMIT = 30;
const SEND_WINDOW_SEC = 60 * 60;

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

interface PersonRow {
  uuid: string;
  username: string;
  avatar: string;
  tier: string;
  name_color: string | null;
  xp?: number;
}

function toPerson(r: PersonRow) {
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
    ...(r.xp != null ? { xp: r.xp } : {}),
  };
}

async function gate(
  env: AuthEnv,
  request: Request,
): Promise<{ user: UserRow } | { fail: Response }> {
  if (!env.STATS_DB) return { fail: json({ error: "friends unavailable" }, 503) };
  const user = await currentUserRow(env, request);
  if (!user) return { fail: json({ error: "not signed in" }, 401) };
  if (!user.username)
    return { fail: json({ error: "set a username first" }, 403) };
  return { user };
}

const PERSON_COLS = `u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.name_color`;

export async function onFriends(
  request: Request,
  env: AuthEnv,
): Promise<Response> {
  const g = await gate(env, request);
  if ("fail" in g) return g.fail;
  const db = env.STATS_DB!;
  const me = g.user;
  const method = request.method.toUpperCase();

  if (method === "GET") {
    const [friends, incoming, outgoing] = await Promise.all([
      db
        .prepare(
          `SELECT ${PERSON_COLS}, COALESCE(st.xp, 0) AS xp FROM friends f
           JOIN users u ON u.id = CASE WHEN f.user_id = ?1 THEN f.friend_id ELSE f.user_id END
           LEFT JOIN user_stats st ON st.user_id = u.id
           WHERE (f.user_id = ?1 OR f.friend_id = ?1) AND f.status = 'accepted'
           ORDER BY u.username_lc`,
        )
        .bind(me.id)
        .all<PersonRow>(),
      db
        .prepare(
          `SELECT ${PERSON_COLS} FROM friends f JOIN users u ON u.id = f.user_id
           WHERE f.friend_id = ?1 AND f.status = 'pending' ORDER BY f.created_at DESC`,
        )
        .bind(me.id)
        .all<PersonRow>(),
      db
        .prepare(
          `SELECT ${PERSON_COLS} FROM friends f JOIN users u ON u.id = f.friend_id
           WHERE f.user_id = ?1 AND f.status = 'pending' ORDER BY f.created_at DESC`,
        )
        .bind(me.id)
        .all<PersonRow>(),
    ]);
    return json({
      friends: (friends.results ?? []).map(toPerson),
      incoming: (incoming.results ?? []).map(toPerson),
      outgoing: (outgoing.results ?? []).map(toPerson),
    });
  }

  if (method !== "POST") return json({ error: "method not allowed" }, 405);

  const allowed = await rateLimitOk(
    db,
    `friends:${me.id}`,
    SEND_LIMIT,
    SEND_WINDOW_SEC,
  );
  if (!allowed) return json({ error: "rate limited" }, 429);

  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  if (!username || username.length > 32)
    return json({ error: "bad username" }, 400);

  const target = await db
    .prepare(
      `SELECT id, ${PERSON_COLS} FROM users u WHERE u.username_lc = ? AND u.username IS NOT NULL`,
    )
    .bind(username.toLowerCase())
    .first<PersonRow & { id: number }>();
  if (!target) return json({ error: "player not found" }, 404);

  const existing = await db
    .prepare(
      `SELECT user_id, friend_id, status FROM friends
       WHERE (user_id = ?1 AND friend_id = ?2) OR (user_id = ?2 AND friend_id = ?1)`,
    )
    .bind(me.id, target.id)
    .first<{ user_id: number; friend_id: number; status: "pending" | "accepted" }>();

  switch (resolveSend(existing, me.id, target.id)) {
    case "self":
      return json({ error: "that's you" }, 400);
    case "already-friends":
      return json({ error: "already friends" }, 409);
    case "already-sent":
      return json({ error: "request already sent" }, 409);
    case "accept-mutual":
      await db
        .prepare(
          `UPDATE friends SET status = 'accepted' WHERE user_id = ?1 AND friend_id = ?2`,
        )
        .bind(target.id, me.id)
        .run();
      return json({ ok: true, status: "accepted", person: toPerson(target) });
    case "new-request":
      break;
  }

  const counts = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM friends WHERE (user_id = ?1 OR friend_id = ?1) AND status = 'accepted') AS friends,
         (SELECT COUNT(*) FROM friends WHERE user_id = ?1 AND status = 'pending') AS outgoing`,
    )
    .bind(me.id)
    .first<{ friends: number; outgoing: number }>();
  if ((counts?.friends ?? 0) >= MAX_FRIENDS)
    return json({ error: "friend list is full" }, 409);
  if ((counts?.outgoing ?? 0) >= MAX_OUTGOING)
    return json({ error: "too many pending requests" }, 409);

  await db
    .prepare(
      `INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?1, ?2, 'pending')`,
    )
    .bind(me.id, target.id)
    .run();
  return json({ ok: true, status: "pending", person: toPerson(target) });
}

export async function onFriend(
  request: Request,
  env: AuthEnv,
  uuid: string,
): Promise<Response> {
  const g = await gate(env, request);
  if ("fail" in g) return g.fail;
  const db = env.STATS_DB!;
  const me = g.user;
  if (!UUID_RE.test(uuid)) return json({ error: "bad id" }, 400);

  const other = await db
    .prepare(`SELECT id FROM users WHERE uuid = ?`)
    .bind(uuid)
    .first<{ id: number }>();
  if (!other) return json({ error: "player not found" }, 404);

  const method = request.method.toUpperCase();
  if (method === "PATCH") {
    const res = await db
      .prepare(
        `UPDATE friends SET status = 'accepted'
         WHERE user_id = ?1 AND friend_id = ?2 AND status = 'pending'`,
      )
      .bind(other.id, me.id)
      .run();
    if (!res.meta.changes) return json({ error: "no such request" }, 404);
    return json({ ok: true });
  }
  if (method === "DELETE") {
    const res = await db
      .prepare(
        `DELETE FROM friends
         WHERE (user_id = ?1 AND friend_id = ?2) OR (user_id = ?2 AND friend_id = ?1)`,
      )
      .bind(me.id, other.id)
      .run();
    if (!res.meta.changes) return json({ error: "not connected" }, 404);
    return json({ ok: true });
  }
  return json({ error: "method not allowed" }, 405);
}

export async function onFriendsLeaderboard(
  request: Request,
  env: AuthEnv,
  metricKey: string,
): Promise<Response> {
  const metric = metricByKey(metricKey);
  if (!metric) return json({ error: "unknown metric" }, 404);
  const g = await gate(env, request);
  if ("fail" in g) return g.fail;
  const me = g.user;

  const col = metric.column;
  const { results } = await env.STATS_DB!.prepare(
    `SELECT ${PERSON_COLS}, COALESCE(s.${col}, 0) AS value
     FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
     WHERE u.id = ?1 OR u.id IN (
       SELECT CASE WHEN f.user_id = ?1 THEN f.friend_id ELSE f.user_id END
       FROM friends f
       WHERE (f.user_id = ?1 OR f.friend_id = ?1) AND f.status = 'accepted'
     )
     ORDER BY value DESC, u.username_lc ASC`,
  )
    .bind(me.id)
    .all<PersonRow & { value: number }>();

  const entries: LeaderboardEntry[] = (results ?? []).map((r) => ({
    ...toPerson(r),
    value: r.value,
  }));
  return json({ entries }, 200);
}

const DATE_SLACK_MS = 24 * 60 * 60 * 1000;

export async function onFriendsToday(
  request: Request,
  env: AuthEnv,
): Promise<Response> {
  const g = await gate(env, request);
  if ("fail" in g) return g.fail;
  const db = env.STATS_DB!;
  const me = g.user;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "bad date" }, 400);
  const drift = Math.abs(
    utcMidnight(date) - utcMidnight(new Date().toISOString().slice(0, 10)),
  );
  if (drift > DATE_SLACK_MS) return json({ error: "date out of range" }, 400);

  const { results } = await db
    .prepare(
      `SELECT u.uuid AS uuid, r.mode AS mode, r.won AS won, r.guesses AS guesses
       FROM friends f
       JOIN users u ON u.id = CASE WHEN f.user_id = ?1 THEN f.friend_id ELSE f.user_id END
       JOIN user_results r ON r.user_id = u.id AND r.date = ?2
       WHERE (f.user_id = ?1 OR f.friend_id = ?1) AND f.status = 'accepted'`,
    )
    .bind(me.id, date)
    .all<{ uuid: string; mode: string; won: number; guesses: number }>();

  const today: Record<string, Record<string, { won: boolean; guesses: number }>> = {};
  for (const r of results ?? []) {
    (today[r.uuid] ??= {})[r.mode] = { won: r.won === 1, guesses: r.guesses };
  }
  return json({ date, results: today }, 200);
}
