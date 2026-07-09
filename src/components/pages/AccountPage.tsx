import { useEffect, useState, type ReactNode } from "react";
import ContentPage from "./ContentPage";
import CardBackdrop from "../CardBackdrop";
import AccountView from "../account/AccountView";
import { useAuth } from "../../lib/useAuth";
import { GAMES_PATH, navigateToPath } from "../../lib/router";

export default function AccountPage() {
  const { user, stats, loading, setUser, logout } = useAuth();

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

  let body: ReactNode;
  if (loading) {
    body = <p>Loading...</p>;
  } else if (!user) {
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
