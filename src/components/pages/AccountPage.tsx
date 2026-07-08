import { useEffect, useState, type ReactNode } from "react";
import ContentPage from "./ContentPage";
import CardBackdrop from "../CardBackdrop";
import AccountView from "../account/AccountView";
import { useAuth } from "../../lib/useAuth";
import { GAMES_PATH, navigateToPath } from "../../lib/router";

export default function AccountPage() {
  const { user, stats, loading, setUser, logout } = useAuth();

  // OAuth failures bounce back here as ?error=<message> (see functions/api/auth).
  // Capture it once, then strip it from the URL/history so it doesn't linger on
  // refresh or get shared.
  const [oauthError, setOauthError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err) return;
    setOauthError(err);
    params.delete("error");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, []);

  // First-login onboarding (name + avatar) is handled globally by <UsernameGate>,
  // so it follows the player onto any route until they've claimed a required name.

  let body: ReactNode;
  if (loading) {
    body = <p>Loading...</p>;
  } else if (!user) {
    // A failed sign-in leaves the player logged out — show the error here rather
    // than silently redirecting them away from it.
    if (oauthError) {
      body = <p className="account-error">{oauthError}</p>;
    } else {
      navigateToPath(GAMES_PATH);
      return;
    }
  } else {
    body = (
      <AccountView
        user={user}
        stats={stats}
        setUser={setUser}
        logout={logout}
      />
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
