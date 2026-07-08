import { useEffect, useState, type CSSProperties } from "react";
import {
  FaRightToBracket,
  FaChevronDown,
  FaUser,
  FaTrophy,
  FaIdBadge,
  FaArrowRightFromBracket,
  FaDiscord,
} from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import AvatarImage from "../AvatarImage";
import { useAuth } from "../../lib/useAuth";
import { beginLogin, TIER_META } from "../../lib/auth";
import { levelFromXp } from "../../lib/accountStats";
import {
  navigateToPath,
  ACCOUNT_PATH,
  LEADERBOARD_PATH,
  profilePath,
  isAccountPath,
} from "../../lib/router";

export default function AccountWidget() {
  const { user, stats, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const [, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Close on any outside click / Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Don't flash a state before the session resolves, and stay out of the way on the
  // account page (which already shows all of this).
  if (loading || isAccountPath(window.location.pathname)) return null;

  const go = (path: string) => () => {
    setOpen(false);
    navigateToPath(path);
  };

  // Sign-in returns to wherever the player currently is, not always /account.
  const here = window.location.pathname + window.location.search;
  const level = user && stats ? levelFromXp(stats.xp) : null;

  return (
    <div className="account-widget-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        className={`account-widget${user ? "" : " account-widget-signedout"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? "Your account" : "Sign in"}
        onClick={() => setOpen((o) => !o)}
      >
        {user ? (
          <>
            <AvatarImage
              avatar={user.avatar}
              size={40}
              foil={user.tier === "mythic"}
            />
            <span className="account-widget-id">
              <span className="account-widget-nrow">
                <span
                  className={`account-widget-name${user.tier === "mythic" ? " foil-text" : ""}`}
                >
                  {user.username ?? "Planeswalker"}
                </span>
                {user.tier !== "common" && (
                  <i
                    className={`${TIER_META[user.tier].keyrune} account-gem${user.tier === "mythic" || user.tier === "creator" ? " gem-foil" : ""}`}
                    role="img"
                    aria-label={TIER_META[user.tier].label}
                    title={TIER_META[user.tier].label}
                  />
                )}
              </span>
              {level && (
                <span className="account-widget-level">
                  Level {level.level}
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <FaRightToBracket aria-hidden="true" />
            <span className="account-widget-name">Sign in</span>
          </>
        )}
        <FaChevronDown className="account-widget-caret" aria-hidden="true" />
      </button>

      {open &&
        (user ? (
          <div className="account-pop" role="menu">
            <div
              className="account-pop-profile"
              style={
                {
                  "--tier-color": TIER_META[user.tier].color,
                } as CSSProperties
              }
            >
              <AvatarImage
                avatar={user.avatar}
                size={50}
                foil={user.tier === "mythic"}
              />
              <div className="account-pop-idcol">
                <span className="account-pop-nrow">
                  <span
                    className={`account-pop-name${user.tier === "mythic" ? " foil-text" : ""}`}
                  >
                    {user.username ?? "Unnamed planeswalker"}
                  </span>
                  {user.tier !== "common" && (
                    <i
                      className={`${TIER_META[user.tier].keyrune} account-gem${user.tier === "mythic" || user.tier === "creator" ? " gem-foil" : ""}`}
                      role="img"
                      aria-label={TIER_META[user.tier].label}
                      title={TIER_META[user.tier].label}
                    />
                  )}
                </span>
                {level ? (
                  <>
                    <span className="account-pop-level">
                      Level {level.level} · {level.into}/{level.span} XP
                    </span>
                    <span className="account-pop-bar">
                      <span
                        className="account-pop-fill"
                        style={{
                          width: `${Math.round(level.progress * 100)}%`,
                        }}
                      />
                    </span>
                  </>
                ) : (
                  <span className="account-pop-level">Signed in</span>
                )}
              </div>
            </div>
            <div className="account-pop-links">
              <button role="menuitem" onClick={go(ACCOUNT_PATH)}>
                <FaUser aria-hidden="true" /> My account
              </button>
              <button role="menuitem" onClick={go(LEADERBOARD_PATH)}>
                <FaTrophy aria-hidden="true" /> Leaderboard
              </button>
              {user.username && (
                <button role="menuitem" onClick={go(profilePath(user.uuid))}>
                  <FaIdBadge aria-hidden="true" /> Public profile
                </button>
              )}
              <button
                role="menuitem"
                className="account-pop-signout"
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
              >
                <FaArrowRightFromBracket aria-hidden="true" /> Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="account-pop account-pop-signin" role="menu">
            <div className="account-oauth">
              <button
                className="oauth-btn oauth-google"
                onClick={() => beginLogin("google", here)}
              >
                <FcGoogle className="oauth-logo" aria-hidden="true" />
                <span>Sign in with Google</span>
              </button>
              <button
                className="oauth-btn oauth-discord"
                onClick={() => beginLogin("discord", here)}
              >
                <FaDiscord className="oauth-logo" aria-hidden="true" />
                <span>Sign in with Discord</span>
              </button>
            </div>
            <p className="account-pop-note">
              <b>Optional!</b> Claim a name, climb the leaderboards, flex on
              others.
            </p>
          </div>
        ))}
    </div>
  );
}
