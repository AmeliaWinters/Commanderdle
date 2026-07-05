import { useEffect, useState } from "react";
import { getConsent, setConsent, REOPEN_EVENT } from "../lib/consent";

/**
 * First-visit cookie-consent banner. Shows until the visitor accepts or rejects non-essential
 * (ads/analytics) cookies; the choice is persisted and gates the AdSense loader.
 */
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
    <div
      className="consent-banner"
      role="region"
      aria-label="Cookie consent"
    >
      <div className="consent-inner">
        <p className="consent-text">
          Commandle uses cookies for ads and analytics to keep the game free. Accept
          to allow them, or reject to keep only what's essential. See our{" "}
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
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
