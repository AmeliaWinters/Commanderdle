import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FaPen, FaArrowRightFromBracket } from "react-icons/fa6";
import AvatarImage from "../AvatarImage";
import AvatarRing from "./AvatarRing";
import AvatarPickerModal from "./AvatarPickerModal";
import StatCards from "./StatCards";
import BonusStatCards from "./BonusStatCards";
import SupporterPanel from "./SupporterPanel";
import ModeTabs from "../ModeTabs";
import BackButton from "../layout/BackButton";
import { updateMe, TIER_META } from "../../lib/auth";
import { levelFromXp } from "../../lib/accountStats";
import type { AccountUser, AccountStats } from "../../lib/auth";
import {
  navigateToPath,
  MODE_PATHS,
  profilePath,
  GAMES_PATH,
} from "../../lib/router";
import { containsProfanity } from "../../lib/profanity";
import { collectionProgress, subscribeCollection } from "../../lib/collection";
import { BINDER_PATH } from "../../lib/router";

type Props = {
  user: AccountUser;
  stats: AccountStats | null;
  setUser: (u: AccountUser | null) => void;
  logout: () => void;
};

export default function AccountView({ user, stats, setUser, logout }: Props) {
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  // Binder progress (commanders unlocked / total), kept live with the collection store.
  const [binder, setBinder] = useState(() => collectionProgress());
  useEffect(
    () => subscribeCollection(() => setBinder(collectionProgress())),
    [],
  );

  // Transient inline confirmation, shared by every save path (username, avatar,
  // leaderboard toggle). Success messages auto-dismiss after a beat; errors linger
  // so they can't be missed. Toast.
  const flashTimer = useRef<number | undefined>(undefined);
  function flash(ok: boolean, text: string) {
    window.clearTimeout(flashTimer.current);
    setSaveMsg({ ok, text });
    if (ok) {
      flashTimer.current = window.setTimeout(() => setSaveMsg(null), 2400);
    }
  }
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    setName(user.username ?? "");
  }, [user]);

  async function saveName() {
    if (busy) return;
    if (containsProfanity(name.trim())) {
      flash(false, "Please choose a username without profanity or slurs.");
      return;
    }
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
    const res = await updateMe({ avatar: id });
    if (res.ok) {
      setUser(res.user);
      flash(true, "Avatar updated");
    } else {
      flash(false, res.error);
    }
  }

  async function toggleOptIn() {
    if (busy) return;
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

  const level = stats ? levelFromXp(stats.xp) : null;
  const tierColor = TIER_META[user.tier].color;

  return (
    <div
      className="account"
      style={{ "--tier-color": tierColor } as CSSProperties}
    >
      <ModeTabs mode={null} onNavigate={(m) => navigateToPath(MODE_PATHS[m])} />
      <BackButton label="Back" onClick={() => navigateToPath(GAMES_PATH)} />

      <div className="account-hero">
        <AvatarRing
          progress={level?.progress ?? 0}
          level={level?.level ?? 1}
          size={105}
        >
          <button
            className="account-avatar-btn"
            onClick={() => setAvatarOpen(true)}
            aria-label="Change avatar"
            title="Change avatar"
          >
            <AvatarImage
              avatar={user.avatar}
              size={105}
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
                  placeholder="3-20 letters, numbers or _"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                />
                <button onClick={saveName} disabled={busy}>
                  {busy ? "..." : "Save"}
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
                    color: tierColor,
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
              {user.tier === "creator"
                ? "Creator"
                : `${TIER_META[user.tier].label} Supporter`}
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

      <a
        className="account-panel account-binder"
        href={BINDER_PATH}
        onClick={(e) => {
          e.preventDefault();
          navigateToPath(BINDER_PATH);
        }}
      >
        <span className="account-binder-label">Binder</span>
        <span className="account-binder-count">
          <strong>{binder.found.toLocaleString()}</strong> /{" "}
          {binder.total.toLocaleString()} commanders unlocked
        </span>
      </a>

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
            You'll show up once you've set a username above.
          </p>
        )}
      </div>

      <SupporterPanel user={user} tierColor={tierColor} />

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
