import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { FaPen, FaArrowRightFromBracket, FaDiscord } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import ContentPage from "./ContentPage";
import AvatarImage from "../AvatarImage";
import CardBackdrop from "../CardBackdrop";
import AvatarRing from "../account/AvatarRing";
import AvatarPickerModal from "../account/AvatarPickerModal";
import StatCards from "../account/StatCards";
import BonusStatCards from "../account/BonusStatCards";
import ModeTabs from "../ModeTabs";
import BackButton from "../layout/BackButton";
import { useAuth } from "../../lib/useAuth";
import { beginLogin, updateMe, TIER_META } from "../../lib/auth";
import { TIER_RANK, TIER_THRESHOLDS_GBP } from "../../lib/avatars";
import { levelFromXp } from "../../lib/accountStats";
import {
  navigateToPath,
  MODE_PATHS,
  profilePath,
  GAMES_PATH,
} from "../../lib/router";

/** One-time error surfaced by the OAuth callback via ?error=... */
function useCallbackError(): string | null {
  const [err] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("error"),
  );
  useEffect(() => {
    if (!err) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [err]);
  return err;
}

function LoggedOut({ error }: { error: string | null }) {
  return (
    <div className="account-signin">
      <BackButton label="Back" onClick={() => navigateToPath(GAMES_PATH)} />
      <h2 className="account-signin-title">Sign in to Commandle</h2>
      {error && <p className="account-error">Couldn’t sign you in: {error}.</p>}
      <p>
        Accounts are optional; every puzzle plays fine without one. Sign in to
        claim a name, climb the leaderboards, and wear your supporter frame if
        you’ve tipped the jar.
      </p>
      <div className="account-oauth">
        <button
          className="oauth-btn oauth-google"
          onClick={() => beginLogin("google")}
        >
          <FcGoogle className="oauth-logo" aria-hidden="true" />
          <span>Sign in with Google</span>
        </button>
        <button
          className="oauth-btn oauth-discord"
          onClick={() => beginLogin("discord")}
        >
          <FaDiscord className="oauth-logo" aria-hidden="true" />
          <span>Sign in with Discord</span>
        </button>
      </div>
      <p className="account-fineprint">
        We only read a sign-in id and your email (to match Ko-fi tips). We never
        touch your Google or Discord name or picture. Your username and avatar
        are yours to pick.
      </p>
    </div>
  );
}

export default function AccountPage() {
  const { user, stats, loading, setUser, logout } = useAuth();
  const error = useCallbackError();
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  // Transient inline confirmation, shared by every save path (username, avatar,
  // leaderboard toggle). Success messages auto-dismiss after a beat; errors linger
  // so they can't be missed.
  const flashTimer = useRef<number | undefined>(undefined);
  function flash(ok: boolean, text: string) {
    window.clearTimeout(flashTimer.current);
    setSaveMsg({ ok, text });
    if (ok) {
      flashTimer.current = window.setTimeout(() => setSaveMsg(null), 2400);
    }
  }
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // First-login onboarding (name + avatar) is handled globally by <UsernameGate>,
  // so it follows the player onto any route until they've claimed a required name.

  useEffect(() => {
    if (user) setName(user.username ?? "");
  }, [user]);

  async function saveName() {
    if (!user || busy) return;
    setBusy(true);
    setSaveMsg(null);
    const res = await updateMe({ username: name.trim() });
    setBusy(false);
    if (res.ok) {
      setUser(res.user);
      setEditingName(false);
      flash(true, "Username saved");
    } else {
      flash(false, res.error);
    }
  }

  async function pickAvatar(id: string) {
    if (!user) return;
    const res = await updateMe({ avatar: id });
    if (res.ok) {
      setUser(res.user);
      flash(true, "Avatar updated");
    } else {
      flash(false, res.error);
    }
  }

  async function toggleOptIn() {
    if (!user || busy) return;
    setBusy(true);
    const next = !user.leaderboardOptIn;
    const res = await updateMe({ leaderboardOptIn: next });
    setBusy(false);
    if (res.ok) {
      setUser(res.user);
      flash(
        true,
        next ? "Showing on leaderboards" : "Hidden from leaderboards",
      );
    } else {
      flash(false, res.error);
    }
  }

  let body: ReactNode;
  if (loading) {
    body = <p>Loading…</p>;
  } else if (!user) {
    body = <LoggedOut error={error} />;
  } else {
    const level = stats ? levelFromXp(stats.xp) : null;
    const tierColor = TIER_META[user.tier].color;
    body = (
      <div
        className="account"
        style={
          user.tier !== "common"
            ? ({ "--tier-color": tierColor } as CSSProperties)
            : undefined
        }
      >
        {/* Site mode tabs, so the account sits within the daily-game furniture and
            shows which of today's puzzles you've already solved. */}
        <ModeTabs
          mode={null}
          onNavigate={(m) => navigateToPath(MODE_PATHS[m])}
        />

        {/* Back control sits below the mode-tabs so it doesn't crowd the masthead.
            Goes to the main page rather than history.back(), which could otherwise
            land on the OAuth callback right after signing in. */}
        <BackButton label="Back" onClick={() => navigateToPath(GAMES_PATH)} />

        {/* Hero banner */}
        <div className="account-hero">
          <AvatarRing
            progress={level?.progress ?? 0}
            level={level?.level ?? 1}
            size={104}
          >
            <button
              className="account-avatar-btn"
              onClick={() => setAvatarOpen(true)}
              aria-label="Change avatar"
              title="Change avatar"
            >
              <AvatarImage
                avatar={user.avatar}
                size={104}
                foil={user.tier === "mythic"}
              />
              <span className="account-avatar-edit" aria-hidden="true">
                <FaPen />
              </span>
            </button>
          </AvatarRing>

          <div className="account-hero-id">
            <div className="account-namerow">
              {editingName ? (
                <span className="account-name-edit">
                  <input
                    value={name}
                    maxLength={20}
                    autoFocus
                    placeholder="3–20 letters, numbers or _"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                  <button onClick={saveName} disabled={busy}>
                    {busy ? "…" : "Save"}
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      setEditingName(false);
                      setName(user.username ?? "");
                    }}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <>
                  <h2
                    className={`account-name${user.tier === "mythic" ? " foil-text" : ""}`}
                    style={{
                      color:
                        user.tier !== "common" && user.tier !== "mythic"
                          ? tierColor
                          : undefined,
                      margin: 0,
                    }}
                  >
                    {user.username ?? "Unnamed planeswalker"}
                    {user.tier !== "common" && (
                      <i
                        className={`${TIER_META[user.tier].keyrune} account-gem`}
                        role="img"
                        aria-label={TIER_META[user.tier].label}
                        title={TIER_META[user.tier].label}
                      />
                    )}
                  </h2>
                  <button
                    className="account-edit-name"
                    onClick={() => setEditingName(true)}
                    aria-label="Edit username"
                    title="Edit username"
                  >
                    <FaPen />
                  </button>
                </>
              )}
            </div>
            {user.tier !== "common" && (
              <span className="account-tier-badge" style={{ color: tierColor }}>
                {TIER_META[user.tier].label}
              </span>
            )}
          </div>

          {level && (
            <div className="account-level">
              <span className="account-level-xp">
                {level.into} / {level.span} XP to level {level.level + 1}
              </span>
            </div>
          )}
        </div>

        {stats && <StatCards stats={stats} />}

        <BonusStatCards />

        {/* Leaderboard opt-in */}
        <div className="account-panel">
          <label className="account-toggle">
            <input
              type="checkbox"
              checked={user.leaderboardOptIn}
              disabled={busy}
              onChange={toggleOptIn}
            />
            <span>Show me on the public leaderboards</span>
          </label>
          {user.leaderboardOptIn && !user.username && (
            <p className="account-fineprint">
              You’ll show up once you’ve set a username above.
            </p>
          )}
        </div>

        {/* Supporter tier */}
        <div className="account-panel account-tier">
          <h3>Support commandle</h3>
          {TIER_RANK[user.tier] === 0 ? (
            <>
              <p>
                If Commandle has become part of your morning, a tip on Ko-fi
                would mean a lot. You will also get a supporter cosmetics.
                Simply use the email linked with your OAuth account
                (Google/Discord) and the frame will appear on your next visit.
              </p>
              <div className="tier-chips">
                {(["uncommon", "rare", "mythic"] as const).map((t) => (
                  <div
                    key={t}
                    className="tier-chip"
                    style={
                      { "--tier-color": TIER_META[t].color } as CSSProperties
                    }
                  >
                    <i
                      className={`${TIER_META[t].keyrune} tier-chip-gem`}
                      aria-hidden="true"
                    />
                    <span className="tier-chip-price">
                      £{TIER_THRESHOLDS_GBP[t]}
                    </span>
                    <span className="tier-chip-label">
                      {TIER_META[t].label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>
              You're a{" "}
              <strong style={{ color: tierColor }}>
                {TIER_META[user.tier].label}
              </strong>{" "}
              supporter. Thank you for keeping the lights on! {"<"}3
            </p>
          )}
        </div>

        <div className="account-actions">
          {user.username && (
            <a
              className="account-btn account-btn-ghost"
              href={profilePath(user.uuid)}
              onClick={(e) => {
                e.preventDefault();
                navigateToPath(profilePath(user.uuid));
              }}
            >
              View public profile
            </a>
          )}
          <button className="account-btn account-btn-quiet" onClick={logout}>
            <FaArrowRightFromBracket aria-hidden="true" />
            Sign out
          </button>
        </div>

        {avatarOpen && (
          <AvatarPickerModal
            current={user.avatar}
            tier={user.tier}
            onSelect={pickAvatar}
            onClose={() => setAvatarOpen(false)}
          />
        )}

        {saveMsg && (
          <div
            className={`account-toast${saveMsg.ok ? "" : " account-toast-err"}`}
            role="status"
            aria-live="polite"
          >
            {saveMsg.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <ContentPage
      title="Commandle - Account"
      description="Sign in to Commandle to appear on the leaderboards and unlock supporter cosmetics."
      canonical="https://commandle.app/account"
      hideBack
    >
      <CardBackdrop />
      {body}
    </ContentPage>
  );
}
