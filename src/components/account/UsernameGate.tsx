import { useEffect, useState } from "react";
import { useAuth } from "../../lib/useAuth";
import Onboarding from "./Onboarding";

/**
 * Global gate that forces a signed-in account to claim a username. Rendered as a
 * sibling of <App>, so the mandatory welcome follows the player onto every route —
 * they can't slip past it by navigating to another URL.
 *
 * Once opened it stays mounted until the player finishes the flow (which the modal
 * only allows after a name is set), so the optional avatar step can follow the
 * required name step even though `user.username` has become truthy by then.
 */
export default function UsernameGate() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.username) setOpen(true);
    // A logged-out user (e.g. after sign-out) should never see the gate.
    if (!user) setOpen(false);
  }, [loading, user]);

  if (!open || !user) return null;
  return <Onboarding onDone={() => setOpen(false)} />;
}
