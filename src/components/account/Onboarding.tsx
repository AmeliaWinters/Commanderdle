import { useRef, useState } from "react";
import AvatarImage from "../AvatarImage";
import AvatarGrid from "./AvatarGrid";
import { useModalFocus } from "../../lib/useModalFocus";
import { useAuth } from "../../lib/useAuth";
import { updateMe } from "../../lib/auth";
import { containsProfanity } from "../../lib/profanity";

/**
 * First-login welcome. Shown once, when a signed-in account has no username yet.
 * Two quick steps — claim a name, then choose a commander-art avatar — so a new
 * player's first taste of their account feels like a proper character creation.
 *
 * Step 1 (choosing a name) is mandatory once you're signed in: while the account has
 * no username the modal can't be dismissed (Escape and the backdrop are ignored, and
 * there's no skip button). Once a name is claimed, step 2 (the avatar) is optional and
 * the modal dismisses freely.
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { user, setUser } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  // Block dismissal until a username exists — the name is required.
  const dismiss = () => {
    if (user?.username) onDone();
  };
  useModalFocus(ref, dismiss);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function claimName() {
    const trimmed = name.trim();
    if (busy) return;
    if (containsProfanity(trimmed)) {
      setError("Please choose a username without profanity or slurs.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await updateMe({ username: trimmed });
    setBusy(false);
    if (res.ok) {
      setUser(res.user);
      setStep(2);
    } else {
      setError(res.error);
    }
  }

  async function chooseAvatar(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await updateMe({ avatar: id });
    setBusy(false);
    if (res.ok) setUser(res.user);
  }

  return (
    <div className="modal-backdrop onboarding-backdrop" onClick={dismiss}>
      <div
        className="modal onboarding"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Commandle"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onboarding-crest">
          <AvatarImage
            avatar={user.avatar}
            size={100}
            foil={user.tier === "mythic"}
          />
        </div>

        {step === 1 ? (
          <>
            <h2 className="onboarding-title">Welcome, planeswalker</h2>
            <p className="onboarding-sub">
              Every legend needs a name. Choose one that'll be revered atop the
              leaderboards.
            </p>
            <input
              className="onboarding-input"
              value={name}
              maxLength={20}
              autoFocus
              placeholder="Your username"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && claimName()}
            />
            <p className="onboarding-hint">
              3-20 letters, numbers or underscores.
            </p>
            {error && <p className="account-error">{error}</p>}
            <button
              className="onboarding-next"
              onClick={claimName}
              disabled={busy || name.trim().length < 3}
            >
              {busy ? "Claiming..." : "Continue"}
            </button>
          </>
        ) : (
          <>
            <h2 className="onboarding-title">Pick your commander</h2>
            <p className="onboarding-sub">
              You can change your avatar whenever you like.
            </p>
            <div className="onboarding-avatars">
              <AvatarGrid
                current={user.avatar}
                tier={user.tier}
                onSelect={chooseAvatar}
              />
            </div>
            <button className="onboarding-next" onClick={onDone}>
              Enter Commandle
            </button>
          </>
        )}
      </div>
    </div>
  );
}
