import { useEffect, useState } from "react";
import { getConsent, setConsent, REOPEN_EVENT } from "../lib/consent";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(() => getConsent() === null);

  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  if (!visible) return null;

  function choose(choice: "granted" | "denied") {
    setConsent(choice);
    setVisible(false);
  }

  return (
    <div className="consent-banner" role="region" aria-label="Cookie consent">
      <div className="consent-inner">
        <p className="consent-text">
          Commandle shows ads to keep the game free. Allow personalised ads and
          analytics cookies for more relevant ads, or reject to keep only
          non-personalised ads and what's essential. See our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
        <div className="consent-actions">
          <button
            type="button"
            className="consent-btn consent-reject"
            onClick={() => choose("denied")}
          >
            Reject
          </button>
          <button
            type="button"
            className="consent-btn consent-accept"
            onClick={() => choose("granted")}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
