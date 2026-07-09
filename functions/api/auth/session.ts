import { EFFECTIVE_TIER_SQL } from "../webhooks/kofi";
import { canChooseNameColor } from "../../../src/lib/avatars";

export interface AuthEnv {
  STATS_DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
}

export interface User {
  uuid: string;
  username: string | null;
  avatar: string;
  tier: "common" | "uncommon" | "rare" | "mythic" | "theCreator";
  nameColor: string | null;
  leaderboardOptIn: boolean;
}

export interface UserRow extends User {
  id: number;
}

export const SESSION_COOKIE = "commandle_session";
export const STATE_COOKIE = "commandle_oauth_state";
const SESSION_TTL_SEC = 60 * 60 * 24 * 60;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function sign(value: string, secret: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    enc.encode(value),
  );
  return `${value}.${toHex(sig)}`;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function unsign(
  signed: string,
  secret: string,
): Promise<string | null> {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = signed.slice(0, dot);
  const expected = await sign(value, secret);
  return constantTimeEqual(expected, signed) ? value : null;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) {
      const rawValue = v.join("=");
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return null;
}

export function cookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  return parts.join("; ");
}

export async function createSession(
  db: D1Database,
  userId: number,
): Promise<string> {
  const token = randomToken();
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    )
    .bind(await sha256Hex(token), userId, expires)
    .run();
  return token;
}

export const SESSION_MAX_AGE = SESSION_TTL_SEC;

export async function destroySession(
  db: D1Database,
  request: Request,
): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(token))
    .run();
}

export async function currentUserRow(
  env: AuthEnv,
  request: Request,
): Promise<UserRow | null> {
  if (!env.STATS_DB) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  try {
    const row = await env.STATS_DB.prepare(
      `SELECT u.id, u.uuid, u.username, u.avatar, ${EFFECTIVE_TIER_SQL} AS tier, u.name_color, u.leaderboard_opt_in
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
      .bind(await sha256Hex(token), Math.floor(Date.now() / 1000))
      .first<{
        id: number;
        uuid: string;
        username: string | null;
        avatar: string;
        tier: string;
        name_color: string | null;
        leaderboard_opt_in: number;
      }>();
    if (!row) return null;
    const tier = (
      ["uncommon", "rare", "mythic", "theCreator"].includes(row.tier)
        ? row.tier
        : "common"
    ) as User["tier"];
    return {
      id: row.id,
      uuid: row.uuid,
      username: row.username,
      avatar: row.avatar,
      tier,
      nameColor: canChooseNameColor(tier) ? (row.name_color ?? null) : null,
      leaderboardOptIn: row.leaderboard_opt_in === 1,
    };
  } catch {
    return null;
  }
}

export async function currentUser(
  env: AuthEnv,
  request: Request,
): Promise<User | null> {
  const row = await currentUserRow(env, request);
  if (!row) return null;
  const { id: _id, ...user } = row;
  return user;
}
