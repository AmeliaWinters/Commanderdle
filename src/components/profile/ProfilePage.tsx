import { useEffect, useState, type CSSProperties } from "react";
import ContentPage from "../pages/ContentPage";
import AvatarImage from "../AvatarImage";
import CardBackdrop from "../CardBackdrop";
import StatCards from "../account/StatCards";
import BonusStatCards from "../account/BonusStatCards";
import AvatarRing from "../account/AvatarRing";
import { fetchProfile } from "../../lib/leaderboardApi";
import type { PublicProfile } from "../../lib/leaderboard";
import { TIER_META, effectiveTierColor, tierNameDisplay } from "../../lib/auth";
import { levelFromXp } from "../../lib/accountStats";
import { useAuth } from "../../lib/useAuth";
import {
  ACCOUNT_PATH,
  navigateToPath,
  profileBinderPath,
} from "../../lib/router";
import { COMMANDERS } from "../../lib/commanders";
import { sendFriendRequest } from "../../lib/friendsApi";

function joinedLabel(unix: number): string {
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export default function ProfilePage({ uuid }: { uuid: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [friendMsg, setFriendMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoading(true);
    fetchProfile(uuid, controller.signal).then((p) => {
      if (!alive) return;
      setProfile(p);
      setLoading(false);
    });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [uuid]);

  function share() {
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  async function addFriend() {
    if (!profile || friendMsg) return;
    const res = await sendFriendRequest(profile.username);
    if (res.ok) {
      setFriendMsg(res.status === "accepted" ? "Friends!" : "Request sent");
    } else {
      setFriendMsg(res.error ?? "Something went wrong");
    }
  }

  const isMe = user?.uuid === uuid;
  const canBefriend = !!user?.username && !isMe;
  const level = profile ? levelFromXp(profile.stats.xp) : null;
  const tierColor = profile
    ? effectiveTierColor(profile.tier, profile.nameColor)
    : "var(--flame-1)";
  const nameDisp = profile
    ? tierNameDisplay(profile.tier, profile.nameColor)
    : null;

  return (
    <ContentPage
      title={
        profile ? `${profile.username} · Commandle` : "Commandle - Profile"
      }
      description="A Commandle player's profile — streaks, win streak, XP and total wins."
      canonical={`https://commandle.app/u/${uuid}`}
      back={{ label: "Back", onClick: () => window.history.back() }}
    >
      <CardBackdrop />
      {loading ? (
        <p>Loading...</p>
      ) : !profile ? (
        <p className="lb-empty">
          No such planeswalker. This profile doesn't exist.
        </p>
      ) : (
        <div
          className="account"
          style={
            profile.tier !== "common"
              ? ({ "--tier-color": tierColor } as CSSProperties)
              : undefined
          }
        >
          <div className="account-hero">
            <AvatarRing
              progress={level?.progress ?? 0}
              level={level?.level ?? 1}
              size={105}
            >
              <AvatarImage
                avatar={profile.avatar}
                size={105}
                className="profile-avatar"
                foil={profile.tier === "mythic"}
              />
            </AvatarRing>
            <div className="account-hero-id">
              <h2
                className={`account-name${nameDisp?.foil ? " foil-text" : ""}`}
                style={nameDisp?.color ? { color: nameDisp.color } : undefined}
              >
                {profile.username}
                {profile.tier !== "common" && (
                  <i
                    className={`${TIER_META[profile.tier].keyrune} account-gem`}
                    role="img"
                    aria-label={TIER_META[profile.tier].label}
                    title={TIER_META[profile.tier].label}
                  />
                )}
              </h2>
              {profile.tier !== "common" && (
                <span
                  className="account-tier-badge"
                  style={{ color: tierColor }}
                >
                  {TIER_META[profile.tier].label} Supporter
                </span>
              )}
              <span className="account-uuid">
                Joined {joinedLabel(profile.joinedAt)}
              </span>
            </div>

            {level && (
              <div className="account-level">
                <span className="account-level-xp">
                  {level.into} / {level.span} XP to level {level.level + 1}
                </span>
              </div>
            )}
          </div>

          <StatCards stats={profile.stats} />

          {profile.bonusStats && <BonusStatCards data={profile.bonusStats} />}

          {profile.binderCount != null && (
            <a
              className="account-panel account-binder"
              href={profileBinderPath(uuid)}
              onClick={(e) => {
                e.preventDefault();
                navigateToPath(profileBinderPath(uuid));
              }}
            >
              <span className="account-binder-label">Binder</span>
              <span className="account-binder-count">
                <strong>{profile.binderCount.toLocaleString()}</strong> /{" "}
                {COMMANDERS.length.toLocaleString()} commanders unlocked
              </span>
            </a>
          )}

          <div className="account-actions">
            <button className="account-btn account-btn-primary" onClick={share}>
              {copied ? "Link copied" : "Share profile"}
            </button>
            {canBefriend && (
              <button
                className="account-btn account-btn-ghost"
                onClick={addFriend}
                disabled={!!friendMsg}
              >
                {friendMsg ?? "Add friend"}
              </button>
            )}
            {isMe && (
              <a
                className="account-btn account-btn-ghost"
                href={ACCOUNT_PATH}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPath(ACCOUNT_PATH);
                }}
              >
                Edit account
              </a>
            )}
          </div>
        </div>
      )}
    </ContentPage>
  );
}
