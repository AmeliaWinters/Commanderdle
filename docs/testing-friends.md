# Testing the friends system

Friends (send request → accept → race on a private leaderboard) touches three layers:

| Layer | What to test | How |
| --- | --- | --- |
| **UI + client** | Every screen state (inbox, sent, board, empty) and the header badge | `npm run dev:auth` — the fastest loop, with HMR |
| **Real backend SQL** | The actual `functions/api/friends.ts` queries against real D1 | `wrangler dev` + two seeded sessions (below) |
| **State machine** | send / accept / decline / mutual-auto-accept edge cases | `npm test` (see `src/lib/friendsFlow.test.ts`) |

Most day-to-day work only needs the first. Reach for the second before a deploy, or when
changing the SQL.

## 1. Fast UI loop — `npm run dev:auth`

```bash
npm run dev:auth        # Vite dev server + the in-memory account mock (vite/devAuthMock.ts)
```

The mock reseeds a full social graph on every "login" so every UI state is populated
immediately: three accepted friends, two incoming requests, one outgoing. Useful tricks:

- Open the account widget → **Sign in with Discord** (the mock shortcuts straight to a
  signed-in session). Add `?named=1` on the login URL to skip the username step.
- The header avatar shows a red dot and the **Friends** menu item a count while the two
  seeded requests are unanswered; accept/decline on `/friends` updates both live.
- **Add friend** accepts any username as a new outgoing request. Two reserved names:
  - `nobody` → 404 "player not found"
  - one of the seeded incoming names (e.g. `AzoriusAndy`) → auto-accepts (mutual request)
- The friend **cards** show a level (from seeded XP) and a five-dot "today" strip; the
  mock seeds a solved / mixed / not-played spread across the three friends so all pip
  states render. Removing every friend reveals the recruit ("copy profile link") state.

Because it's in-memory, editing `vite/devAuthMock.ts` (or restarting) resets the graph.

## 2. Real backend — `wrangler dev` with two accounts

This runs the real Worker (`worker/index.ts`) and the real `friends.ts` SQL against a
**local** D1 file. Real OAuth needs provider secrets and two browsers, which is slow — so
instead we seed two named accounts and their sessions directly, then drive the API with
their session cookies. This exercises the exact production queries.

```bash
npm run build
# Apply the schema to the LOCAL D1 (safe to re-run; all CREATE TABLE IF NOT EXISTS):
npx wrangler d1 execute commandle-stats --local --file functions/api/schema.sql
```

Pick two session tokens and hash them the same way the server does
(`sha256Hex`, see `functions/api/auth/session.ts`):

```bash
node -e "const c=require('crypto');for(const t of['tokenA','tokenB'])console.log(t,'=>',c.createHash('sha256').update(t).digest('hex'))"
# tokenA => <hashA>
# tokenB => <hashB>
```

Seed two users + non-expiring sessions (swap in the two hashes above):

```bash
npx wrangler d1 execute commandle-stats --local --command "
INSERT INTO users (uuid, provider, provider_id, username, username_lc, avatar)
VALUES ('11111111-1111-1111-1111-111111111111','google','devA','Alice','alice','Atraxa, Praetors'' Voice'),
       ('22222222-2222-2222-2222-222222222222','google','devB','Bob','bob','The Ur-Dragon');
INSERT INTO sessions (token_hash, user_id, expires_at)
VALUES ('<hashA>',(SELECT id FROM users WHERE username_lc='alice'),9999999999),
       ('<hashB>',(SELECT id FROM users WHERE username_lc='bob'),  9999999999);
"
```

Start the Worker and drive the flow with each user's cookie:

```bash
npx wrangler dev --port 8787

# Alice sends Bob a request
curl -s -X POST localhost:8787/api/friends \
  -H 'Cookie: commandle_session=tokenA' -H 'content-type: application/json' \
  -d '{"username":"Bob"}'

# Bob sees it as incoming, and his /me carries the pending count
curl -s localhost:8787/api/friends       -H 'Cookie: commandle_session=tokenB'
curl -s localhost:8787/api/auth/me       -H 'Cookie: commandle_session=tokenB'   # pendingFriendRequests: 1

# Bob accepts (uses Alice's uuid)
curl -s -X PATCH localhost:8787/api/friends/11111111-1111-1111-1111-111111111111 \
  -H 'Cookie: commandle_session=tokenB'

# Both now see each other on their friends board
curl -s localhost:8787/api/friends/leaderboard/xp -H 'Cookie: commandle_session=tokenA'
```

Things worth checking against the real SQL specifically (the mock fakes these):

- Sending twice → 409 "request already sent"; sending to someone who already asked you →
  auto-accepts (no duplicate row).
- `DELETE /api/friends/:uuid` removes the relationship in **either** direction.
- An account with no username set → 403 on every route (you're found by username).

To inspect state directly: `npx wrangler d1 execute commandle-stats --local --command "SELECT * FROM friends"`.

## 3. State-machine unit test

`src/lib/friendsFlow.test.ts` covers the request lifecycle (send, accept, decline, cancel,
mutual auto-accept, self-add) against a small in-memory D1 stub, so the transitions are
guarded without a running Worker. Run with `npm test`.
