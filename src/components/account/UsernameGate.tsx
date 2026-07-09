import { useEffect, useState } from "react";
import { useAuth } from "../../lib/useAuth";
import Onboarding from "./Onboarding";

export default function UsernameGate() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.username) setOpen(true);
    if (!user) setOpen(false);
  }, [loading, user]);

  if (!open || !user) return null;
  return <Onboarding onDone={() => setOpen(false)} />;
}
