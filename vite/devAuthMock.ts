/**
 * Dev-only in-memory mock of the account backend (`functions/api/auth`, `/api/account`,
 * `/api/leaderboard`, `/api/profile`).
 *
 * The real endpoints live in Cloudflare Pages Functions, which only run under
 * `npx wrangler dev` (needs a build first, and has no HMR). That makes iterating on the
 * *design* of the login / account / leaderboard screens painful. This plugin serves
 * plausible fake responses straight from the Vite dev server, so `npm run dev` keeps hot
 * reload AND you can drive the whole signed-in flow.
 *
 * It is OFF by default. Enable it with `npm run dev:auth` (sets MOCK_AUTH=1). It is never
 * bundled or served in production — it's a Vite `configureServer` middleware only.
 *
 * What it fakes:
 *   GET   /api/auth/:provider/login      → "signs in" a fresh account, 302 back to returnTo
 *   GET   /api/auth/:provider/callback   → same (in case you hit it directly)
 *   POST  /api/auth/logout               → clears the in-memory session
 *   GET   /api/auth/me                   → { user, stats } for the mock account (or null)
 *   PATCH /api/auth/me                   → updates username / avatar / leaderboard opt-in
 *   POST  /api/account/results           → echoes back stats
 *   GET   /api/leaderboard/:metric       → a fake board (with the mock account slotted in)
 *   GET   /api/profile/:uuid             → a fake public profile
 *   /api/friends (+ /:uuid, /leaderboard/:metric, /today) → in-memory friends store,
 *                                          reseeded on login with friends + requests in
 *                                          every state, plus a sample "today" strip
 *
 * Handy query params on the login route to exercise cosmetics / states:
 *   ?tier=mythic        → sign in as a supporter (common | uncommon | rare | mythic | theCreator)
 *   ?named=1            → skip the "choose a username" step (starts with a username set)
 */
import type { Connect, Plugin } from "vite";
import type { ServerResponse } from "node:http";

type Tier = "common" | "uncommon" | "rare" | "mythic" | "theCreator";

interface MockUser {
  uuid: string;
  username: string | null;
  avatar: string;
  tier: Tier;
  nameColor: string | null;
  leaderboardOptIn: boolean;
}

const canChooseNameColor = (tier: Tier): boolean =>
  tier === "mythic" || tier === "theCreator";
const isHexColor = (v: string): boolean =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);

// Single-process dev server → module-level state is the "session". Persists across page
// reloads; resets when this file is edited (HMR) or the server restarts.
let user: MockUser | null = null;

interface MockPerson {
  uuid: string;
  username: string;
  avatar: string;
  tier: Tier;
  nameColor: string | null;
  xp: number;
}

const person = (
  i: number,
  username: string,
  avatar: string,
  tier: Tier = "common",
  xp = 0,
): MockPerson => ({
  uuid: `dev-friend-${i}`,
  username,
  avatar,
  tier,
  nameColor: null,
  xp,
});

// In-memory friends state, reseeded on every mock login so each dev session starts
// with every UI state populated (accepted friends, an inbox, an open outgoing request).
const seedSocial = () => ({
  friends: [
    person(1, "PlaneswalkerPat", "The Ur-Dragon", "mythic", 9200),
    person(2, "GruulSmash", "Krenko, Mob Boss", "rare", 3100),
    person(3, "SimicSteve", "Y'shtola, Night's Blessed", "common", 640),
  ],
  incoming: [
    person(4, "AzoriusAndy", "Edgar Markov", "uncommon"),
    person(5, "OrzhovOlivia", "Atraxa, Praetors' Voice"),
  ],
  outgoing: [person(6, "DimirDana", "Edgar Markov")],
});
let social = seedSocial();

const DEFAULT_AVATAR = "Atraxa, Praetors' Voice";

const stats = {
  playStreak: 7,
  maxPlayStreak: 21,
  winStreak: 3,
  maxWinStreak: 9,
  totalWins: 142,
  xp: 4820,
};

const isTier = (v: string): v is Tier =>
  v === "common" ||
  v === "uncommon" ||
  v === "rare" ||
  v === "mythic" ||
  v === "theCreator";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(payload);
}

function redirect(res: ServerResponse, to: string): void {
  res.statusCode = 302;
  res.setHeader("Location", to);
  res.end();
}

async function readBody(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

// A handful of fake ranked accounts so the board looks alive.
const FAKE_BOARD = [
  {
    username: "PlaneswalkerPat",
    avatar: "The Ur-Dragon",
    tier: "mythic" as Tier,
  },
  { username: "GruulSmash", avatar: "Krenko, Mob Boss", tier: "rare" as Tier },
  { username: "AzoriusAndy", avatar: "Edgar Markov", tier: "uncommon" as Tier },
  {
    username: "SimicSteve",
    avatar: "Y'shtola, Night's Blessed",
    tier: "common" as Tier,
  },
  {
    username: "RakdosRiot",
    avatar: "Atraxa, Praetors' Voice",
    tier: "rare" as Tier,
  },
  {
    username: "RakdosRiot",
    avatar: "Atraxa, Praetors' Voice",
    tier: "rare" as Tier,
  },
  {
    username: "RakdosRiot",
    avatar: "Atraxa, Praetors' Voice",
    tier: "rare" as Tier,
  },
  {
    username: "RakdosRiot",
    avatar: "Atraxa, Praetors' Voice",
    tier: "rare" as Tier,
  },
];

export function devAuthMock(): Plugin {
  return {
    name: "dev-auth-mock",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url || "";
        if (!raw.startsWith("/api/")) return next();
        const url = new URL(raw, "http://localhost");
        const path = url.pathname;
        const method = (req.method || "GET").toUpperCase();

        // --- auth: login (shortcut straight to a signed-in session) ---
        const loginMatch = path.match(
          /^\/api\/auth\/(google|discord)\/(login|callback)$/,
        );
        if (loginMatch) {
          const tierParam = url.searchParams.get("tier");
          const tier: Tier =
            tierParam && isTier(tierParam) ? tierParam : "common";
          const named = url.searchParams.get("named") === "1";
          user = {
            uuid: "dev-0000-0000-0000-000000000001",
            username: named ? "DevPlayer" : null,
            avatar: DEFAULT_AVATAR,
            tier,
            nameColor: null,
            leaderboardOptIn: named,
          };
          social = seedSocial();
          const returnTo = url.searchParams.get("returnTo");
          redirect(
            res,
            returnTo && returnTo.startsWith("/") ? returnTo : "/account",
          );
          return;
        }

        // --- auth: me ---
        if (path === "/api/auth/me" && method === "GET") {
          return sendJson(res, 200, {
            user,
            stats: user ? stats : null,
            pendingFriendRequests: user ? social.incoming.length : 0,
          });
        }
        if (path === "/api/auth/me" && method === "PATCH") {
          if (!user) return sendJson(res, 401, { error: "not signed in" });
          const body = (await readBody(req)) as {
            username?: unknown;
            avatar?: unknown;
            leaderboardOptIn?: unknown;
            nameColor?: unknown;
          };
          if (typeof body.username === "string") {
            const name = body.username.trim();
            if (!USERNAME_RE.test(name))
              return sendJson(res, 400, {
                error: "username must be 3-20 letters, numbers or underscores",
              });
            if (name.toLowerCase() === "taken")
              return sendJson(res, 409, { error: "that username is taken" });
            user.username = name;
          }
          if (typeof body.avatar === "string") user.avatar = body.avatar;
          if (typeof body.leaderboardOptIn === "boolean")
            user.leaderboardOptIn = body.leaderboardOptIn;
          if (body.nameColor === null || typeof body.nameColor === "string") {
            if (!canChooseNameColor(user.tier))
              return sendJson(res, 403, {
                error: "a custom colour is a Mythic supporter perk",
              });
            if (body.nameColor !== null && !isHexColor(body.nameColor))
              return sendJson(res, 400, {
                error: "colour must be a hex value like #ff8800",
              });
            user.nameColor = body.nameColor;
          }
          return sendJson(res, 200, { user });
        }

        // --- auth: logout ---
        if (path === "/api/auth/logout" && method === "POST") {
          user = null;
          return sendJson(res, 200, { ok: true });
        }

        // --- account: submit a result ---
        if (path === "/api/account/results" && method === "POST") {
          await readBody(req);
          return sendJson(res, 200, { stats });
        }

        // --- account: per-mode play stats (server-truth) ---
        if (path === "/api/account/mode-stats" && method === "GET") {
          if (!user) return sendJson(res, 401, { error: "not signed in" });
          const modeStats = {
            classic: {
              played: 12,
              wins: 9,
              currentStreak: 3,
              maxStreak: 5,
              lastPlayedDate: null,
              distribution: { 2: 2, 3: 4, 4: 2, 5: 1 },
            },
          };
          return sendJson(res, 200, { modeStats });
        }

        // --- leaderboard ---
        const lbMatch = path.match(/^\/api\/leaderboard\/([\w-]+)$/);
        if (lbMatch && method === "GET") {
          const base = FAKE_BOARD.map((e, i) => ({
            uuid: `dev-board-${i}`,
            username: e.username,
            avatar: e.avatar,
            tier: e.tier,
            nameColor: null,
            value: 250 - i * 30,
          }));
          const you =
            user && user.username && user.leaderboardOptIn
              ? {
                  uuid: user.uuid,
                  username: user.username,
                  avatar: user.avatar,
                  tier: user.tier,
                  nameColor: user.nameColor,
                  value: 175,
                  rank: 3,
                }
              : undefined;
          return sendJson(res, 200, { entries: base, you });
        }

        // --- friends: private board (must match before the :uuid route) ---
        const friendsLbMatch = path.match(
          /^\/api\/friends\/leaderboard\/([\w-]+)$/,
        );
        if (friendsLbMatch && method === "GET") {
          if (!user || !user.username)
            return sendJson(res, 401, { error: "not signed in" });
          const entries = [
            {
              uuid: user.uuid,
              username: user.username,
              avatar: user.avatar,
              tier: user.tier,
              nameColor: user.nameColor,
              value: 175,
            },
            ...social.friends.map((f, i) => ({ ...f, value: 220 - i * 60 })),
          ].sort((a, b) => b.value - a.value);
          return sendJson(res, 200, { entries });
        }

        // --- friends: today's dailies per friend ---
        if (path === "/api/friends/today" && method === "GET") {
          if (!user || !user.username)
            return sendJson(res, 401, { error: "not signed in" });
          const date = url.searchParams.get("date") ?? "";
          // A plausible mix so the today strip shows solved / missed / not-played.
          const results: Record<
            string,
            Record<string, { won: boolean; guesses: number }>
          > = {};
          const f = social.friends;
          if (f[0])
            results[f[0].uuid] = {
              classic: { won: true, guesses: 3 },
              silhouette: { won: true, guesses: 2 },
              zoom: { won: true, guesses: 4 },
              synergy: { won: true, guesses: 1 },
              quote: { won: true, guesses: 5 },
            };
          if (f[1])
            results[f[1].uuid] = {
              classic: { won: true, guesses: 4 },
              zoom: { won: false, guesses: 6 },
            };
          // f[2] has played nothing today → all-empty strip.
          return sendJson(res, 200, { date, results });
        }

        // --- friends: lists + send request ---
        if (path === "/api/friends") {
          if (!user || !user.username)
            return sendJson(res, 401, { error: "not signed in" });
          if (method === "GET") return sendJson(res, 200, social);
          if (method === "POST") {
            const body = (await readBody(req)) as { username?: unknown };
            const name =
              typeof body.username === "string" ? body.username.trim() : "";
            if (!name) return sendJson(res, 400, { error: "bad username" });
            const lc = name.toLowerCase();
            if (lc === user.username.toLowerCase())
              return sendJson(res, 400, { error: "that's you" });
            if (social.friends.some((f) => f.username.toLowerCase() === lc))
              return sendJson(res, 409, { error: "already friends" });
            if (social.outgoing.some((f) => f.username.toLowerCase() === lc))
              return sendJson(res, 409, { error: "request already sent" });
            const mutual = social.incoming.find(
              (f) => f.username.toLowerCase() === lc,
            );
            if (mutual) {
              social.incoming = social.incoming.filter((f) => f !== mutual);
              social.friends.push(mutual);
              return sendJson(res, 200, {
                ok: true,
                status: "accepted",
                person: mutual,
              });
            }
            // Any unknown name "exists" in dev, except the reserved miss case.
            if (lc === "nobody")
              return sendJson(res, 404, { error: "player not found" });
            const p = person(Date.now() % 100000, name, DEFAULT_AVATAR);
            social.outgoing.push(p);
            return sendJson(res, 200, { ok: true, status: "pending", person: p });
          }
          return sendJson(res, 405, { error: "method not allowed" });
        }

        // --- friends: accept / remove one ---
        const friendMatch = path.match(/^\/api\/friends\/([\w-]+)$/);
        if (friendMatch && (method === "PATCH" || method === "DELETE")) {
          if (!user || !user.username)
            return sendJson(res, 401, { error: "not signed in" });
          const id = friendMatch[1];
          if (method === "PATCH") {
            const p = social.incoming.find((f) => f.uuid === id);
            if (!p) return sendJson(res, 404, { error: "no such request" });
            social.incoming = social.incoming.filter((f) => f !== p);
            social.friends.push(p);
            return sendJson(res, 200, { ok: true });
          }
          const before =
            social.friends.length +
            social.incoming.length +
            social.outgoing.length;
          social.friends = social.friends.filter((f) => f.uuid !== id);
          social.incoming = social.incoming.filter((f) => f.uuid !== id);
          social.outgoing = social.outgoing.filter((f) => f.uuid !== id);
          const after =
            social.friends.length +
            social.incoming.length +
            social.outgoing.length;
          if (before === after)
            return sendJson(res, 404, { error: "not connected" });
          return sendJson(res, 200, { ok: true });
        }

        // --- account: bonus daily mirror ---
        if (path === "/api/account/bonus" && method === "POST") {
          if (!user) return sendJson(res, 401, { error: "not signed in" });
          await readBody(req);
          return sendJson(res, 200, { ok: true });
        }

        // --- public binder ---
        const binderMatch = path.match(/^\/api\/profile\/([\w-]+)\/binder$/);
        if (binderMatch && method === "GET") {
          return sendJson(res, 200, {
            binder: {
              "The Ur-Dragon": { firstFound: "2025-06-01", modes: ["classic"] },
              "Edgar Markov": {
                firstFound: "2025-06-02",
                modes: ["classic", "zoom"],
              },
              "Krenko, Mob Boss": {
                firstFound: "2025-06-03",
                modes: ["silhouette"],
              },
            },
          });
        }

        // --- public profile ---
        const profMatch = path.match(/^\/api\/profile\/([\w-]+)$/);
        if (profMatch && method === "GET") {
          const isSelf = user && profMatch[1] === user.uuid;
          return sendJson(res, 200, {
            profile: {
              uuid: profMatch[1],
              username:
                isSelf && user?.username ? user.username : "PlaneswalkerPat",
              avatar: isSelf ? user!.avatar : "The Ur-Dragon",
              tier: isSelf ? user!.tier : ("mythic" as Tier),
              // Another player's profile carries their chosen flare, so the page's
              // themed rendering can be exercised in dev too.
              nameColor: isSelf ? user!.nameColor : "#3fd0ff",
              joinedAt: Math.floor(Date.parse("2025-01-15T00:00:00Z") / 1000),
              stats,
              bonusStats: {
                grid: { dayStreak: 4, winStreak: 2, highestStreak: 6 },
                "guess-the-cost": {
                  dayStreak: 2,
                  winStreak: 1,
                  highestStreak: 11,
                },
                "higher-lower": {
                  dayStreak: 7,
                  winStreak: 5,
                  highestStreak: 23,
                },
              },
              binderCount: 3,
            },
          });
        }

        return next();
      });
    },
  };
}
