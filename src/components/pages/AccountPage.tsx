import type { ReactNode } from "react";
import ContentPage from "./ContentPage";
import CardBackdrop from "../CardBackdrop";
import AccountView from "../account/AccountView";
import { useAuth } from "../../lib/useAuth";
import { GAMES_PATH, navigateToPath } from "../../lib/router";

export default function AccountPage() {
  const { user, stats, loading, setUser, logout } = useAuth();

  // First-login onboarding (name + avatar) is handled globally by <UsernameGate>,
  // so it follows the player onto any route until they've claimed a required name.

  let body: ReactNode;
  if (loading) {
    body = <p>Loading...</p>;
  } else if (!user) {
    navigateToPath(GAMES_PATH);
    return;
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
