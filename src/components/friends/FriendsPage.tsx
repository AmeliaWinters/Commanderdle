import { useCallback, useEffect, useRef, useState } from "react";
import ContentPage from "../pages/ContentPage";
import ModeTabs from "../ModeTabs";
import BackButton from "../layout/BackButton";
import AvatarImage from "../AvatarImage";
import LeaderboardList from "../leaderboard/LeaderboardList";
import { TIER_META, tierNameDisplay } from "../../lib/auth";
import { levelFromXp } from "../../lib/accountStats";
import { useAuth } from "../../lib/useAuth";
import {
  fetchFriends,
  fetchFriendsToday,
  fetchFriendsLeaderboard,
  sendFriendRequest,
  acceptFriend,
  removeFriend,
  type FriendLists,
  type FriendPerson,
  type FriendsToday,
} from "../../lib/friendsApi";
import {
  LEADERBOARD_METRICS,
  DEFAULT_METRIC,
  metricByKey,
  type LeaderboardEntry,
} from "../../lib/leaderboard";
import { MODES } from "../../lib/shareCode";
import { todayKey } from "../../lib/dailyAnswer";
import {
  ACCOUNT_PATH,
  MODE_PATHS,
  navigateToPath,
  profilePath,
} from "../../lib/router";

/** Human labels for the five daily modes, for the "today" strip tooltips. */
const MODE_LABEL: Record<string, string> = {
  classic: "Classic",
  silhouette: "Silhouette",
  zoom: "Zoom",
  synergy: "Synergy",
  quote: "Quote",
};

/** Small name + tier gem, shared by cards and request rows. */
function NameTag({ person }: { person: FriendPerson }) {
  const nameDisp = tierNameDisplay(person.tier, person.nameColor);
  return (
    <span
      className={`friend-name${nameDisp.foil ? " foil-text" : ""}`}
      style={nameDisp.color ? { color: nameDisp.color } : undefined}
    >
      {person.username}
      {person.tier !== "common" && (
        <i
          className={`${TIER_META[person.tier].keyrune} friend-gem`}
          role="img"
          aria-label={TIER_META[person.tier].label}
          title={TIER_META[person.tier].label}
        />
      )}
    </span>
  );
}

/** The five-dot "how they did today" strip for one friend. */
function TodayStrip({ results }: { results?: Record<string, { won: boolean; guesses: number }> }) {
  return (
    <div className="friend-today" role="img" aria-label="Today's dailies">
      {MODES.map((mode) => {
        const r = results?.[mode];
        const state = !r ? "empty" : r.won ? "correct" : "wrong";
        const label = !r
          ? `${MODE_LABEL[mode]}: not played`
          : r.won
            ? `${MODE_LABEL[mode]}: solved in ${r.guesses}`
            : `${MODE_LABEL[mode]}: not solved`;
        return (
          <span key={mode} className={`friend-dot friend-dot-${state}`} title={label} />
        );
      })}
    </div>
  );
}

/** One accepted friend: avatar, name, level, today strip, and a remove menu. */
function FriendCard({
  person,
  today,
  onRemove,
}: {
  person: FriendPerson;
  today?: Record<string, { won: boolean; guesses: number }>;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const level = levelFromXp(person.xp ?? 0);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  return (
    <li className="friend-card">
      <a
        className="friend-card-main"
        href={profilePath(person.uuid)}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          navigateToPath(profilePath(person.uuid));
        }}
      >
        <AvatarImage avatar={person.avatar} size={46} foil={person.tier === "mythic"} />
        <span className="friend-card-id">
          <NameTag person={person} />
          <span className="friend-card-level">Level {level.level}</span>
        </span>
      </a>
      <TodayStrip results={today} />
      <div className="friend-card-menu" ref={ref}>
        <button
          className="friend-menu-btn"
          aria-label={`Manage ${person.username}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          ⋯
        </button>
        {menu && (
          <div className="friend-menu-pop" role="menu">
            <button
              role="menuitem"
              onClick={() => {
                setMenu(false);
                onRemove();
              }}
            >
              Remove friend
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** A pending request row (incoming = accept/decline, outgoing = cancel). */
function RequestRow({
  person,
  actions,
}: {
  person: FriendPerson;
  actions: { label: string; onClick: () => void; kind?: "primary" }[];
}) {
  return (
    <li className="friend-req">
      <a
        className="friend-req-id"
        href={profilePath(person.uuid)}
        onClick={(e) => {
          e.preventDefault();
          navigateToPath(profilePath(person.uuid));
        }}
      >
        <AvatarImage avatar={person.avatar} size={34} foil={person.tier === "mythic"} />
        <NameTag person={person} />
      </a>
      <span className="friend-req-actions">
        {actions.map((a) => (
          <button
            key={a.label}
            className={`account-btn ${a.kind === "primary" ? "account-btn-primary" : "account-btn-ghost"} friend-req-btn`}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
      </span>
    </li>
  );
}

/** The friends hub: add friends, answer requests, see how everyone's doing today. */
export default function FriendsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [lists, setLists] = useState<FriendLists | null>(null);
  const [today, setToday] = useState<FriendsToday>({});
  const [metric, setMetric] = useState(DEFAULT_METRIC);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const signedIn = !!user;
  const named = !!user?.username;

  const reload = useCallback(() => {
    if (!named) return;
    fetchFriends().then(setLists);
    fetchFriendsToday(todayKey()).then(setToday);
    fetchFriendsLeaderboard(metric).then(setBoard);
  }, [named, metric]);

  useEffect(reload, [reload]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const username = name.trim();
    if (!username || sending) return;
    setSending(true);
    const res = await sendFriendRequest(username);
    setSending(false);
    if (!res.ok) {
      setNotice(res.error ?? "Something went wrong.");
      return;
    }
    setName("");
    setNotice(
      res.status === "accepted"
        ? `You and ${res.person?.username ?? username} are now friends!`
        : `Request sent to ${res.person?.username ?? username}.`,
    );
    reload();
    void refresh();
  }

  async function act(fn: () => Promise<boolean>) {
    setNotice((await fn()) ? null : "Something went wrong - try again.");
    reload();
    void refresh();
  }

  function copyProfile() {
    if (!user) return;
    const url = window.location.origin + profilePath(user.uuid);
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  const friendCount = lists?.friends.length ?? 0;

  return (
    <ContentPage
      title="Commandle - Friends"
      description="Add friends on Commandle and see how you all did on today's dailies."
      canonical="https://commandle.app/friends"
      hideBack
      wide
    >
      <ModeTabs mode={null} onNavigate={(m) => navigateToPath(MODE_PATHS[m])} />
      <BackButton label="Back" onClick={() => window.history.back()} />

      {authLoading ? (
        <p>Loading...</p>
      ) : !signedIn || !named ? (
        <>
          <h2>Friends</h2>
          <p className="lb-empty">
            {!signedIn
              ? "Sign in to add friends and see how you all did today."
              : "Pick a username first so friends can find you."}{" "}
            <a
              href={ACCOUNT_PATH}
              onClick={(e) => {
                e.preventDefault();
                navigateToPath(ACCOUNT_PATH);
              }}
            >
              {!signedIn ? "Sign in" : "Set a username"}
            </a>
          </p>
        </>
      ) : (
        <>
          <div className="friends-hero">
            <div className="friends-hero-head">
              <h2>Friends</h2>
              {lists && (
                <span className="friends-count">
                  {friendCount} {friendCount === 1 ? "friend" : "friends"}
                </span>
              )}
            </div>
            <form className="friends-add" onSubmit={onSend}>
              <input
                className="friends-add-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Add a friend by username"
                maxLength={32}
                aria-label="Friend's username"
              />
              <button
                className="account-btn account-btn-primary"
                type="submit"
                disabled={sending || !name.trim()}
              >
                {sending ? "Sending..." : "Add"}
              </button>
            </form>
            {notice && <p className="friends-notice">{notice}</p>}
          </div>

          {!!lists?.incoming.length && (
            <section className="friends-panel friends-inbox">
              <h3>
                Friend requests
                <span className="friends-inbox-count">
                  {lists.incoming.length}
                </span>
              </h3>
              <ul className="friend-req-list">
                {lists.incoming.map((p) => (
                  <RequestRow
                    key={p.uuid}
                    person={p}
                    actions={[
                      {
                        label: "Accept",
                        kind: "primary",
                        onClick: () => act(() => acceptFriend(p.uuid)),
                      },
                      {
                        label: "Decline",
                        onClick: () => act(() => removeFriend(p.uuid)),
                      },
                    ]}
                  />
                ))}
              </ul>
            </section>
          )}

          {!!lists?.outgoing.length && (
            <section className="friends-section">
              <h3 className="friends-subtle">Sent requests</h3>
              <ul className="friend-req-list">
                {lists.outgoing.map((p) => (
                  <RequestRow
                    key={p.uuid}
                    person={p}
                    actions={[
                      {
                        label: "Cancel",
                        onClick: () => act(() => removeFriend(p.uuid)),
                      },
                    ]}
                  />
                ))}
              </ul>
            </section>
          )}

          <section className="friends-section">
            {lists && friendCount === 0 ? (
              <div className="friends-recruit">
                <p className="friends-recruit-lead">
                  No friends yet. Send your profile link and challenge someone to
                  beat your streak.
                </p>
                <button
                  className="account-btn account-btn-primary"
                  onClick={copyProfile}
                >
                  {copied ? "Link copied!" : "Copy my profile link"}
                </button>
              </div>
            ) : (
              lists && (
                <>
                  <div className="friends-list-head">
                    <span className="friends-today-legend">
                      Today's dailies
                    </span>
                  </div>
                  <ul className="friend-list">
                    {lists.friends.map((p) => (
                      <FriendCard
                        key={p.uuid}
                        person={p}
                        today={today[p.uuid]}
                        onRemove={() => act(() => removeFriend(p.uuid))}
                      />
                    ))}
                  </ul>
                </>
              )
            )}
          </section>

          {!!lists?.friends.length && (
            <section className="friends-section">
              <h3>Friends board</h3>
              <div className="lb-tabs lb-tabs-page" role="tablist">
                {LEADERBOARD_METRICS.map((m) => (
                  <button
                    key={m.key}
                    role="tab"
                    aria-selected={metric === m.key}
                    className={`lb-tab${metric === m.key ? " active" : ""}`}
                    onClick={() => setMetric(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {!board ? (
                <p>Loading...</p>
              ) : (
                <div className="lb-board">
                  <LeaderboardList
                    entries={board}
                    unit={metricByKey(metric)?.unit}
                    meUuid={user?.uuid}
                  />
                </div>
              )}
            </section>
          )}
        </>
      )}
    </ContentPage>
  );
}
