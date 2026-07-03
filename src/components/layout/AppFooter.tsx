import { useState, useEffect } from "react";
import { puzzleNumber } from "../../lib/dailyAnswer";
import { navigateToPath, ARCHIVE_PATH } from "../../lib/router";
import { useCountdown } from "../../lib/useCountdown";
import AdBanner, { toggleAdTestMode, isAdTestMode } from "../AdBanner";

interface Props {
  isArchive: boolean;
  archiveDate?: string;
}

/** Bottom bar: ad slot, puzzle number/countdown line, credits and privacy link. */
export default function AppFooter({ isArchive, archiveDate }: Props) {
  const countdown = useCountdown();
  const [adTest, setAdTest] = useState(isAdTestMode);

  useEffect(() => {
    const onToggle = (e: Event) =>
      setAdTest((e as CustomEvent<boolean>).detail);
    window.addEventListener("commanderdle:ad-test-toggle", onToggle);
    return () =>
      window.removeEventListener("commanderdle:ad-test-toggle", onToggle);
  }, []);

  function navPrivacy(e: React.MouseEvent) {
    e.preventDefault();
    navigateToPath("/privacy");
  }

  return (
    <div className="bottom-bar">
      <AdBanner />
      <footer className="app-footer">
        <p className="footer-meta">
          Commandle No. {puzzleNumber(archiveDate)}
          {isArchive ? (
            <>
              {" "}
              ·{" "}
              <a
                href={ARCHIVE_PATH}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPath(ARCHIVE_PATH);
                }}
              >
                Back to archive
              </a>
            </>
          ) : (
            <>
              {" "}
              · Next commander in <strong>{countdown}</strong>
            </>
          )}
        </p>
        Data from{" "}
        <a
          href="https://edhrec.com/commanders"
          target="_blank"
          rel="noreferrer"
        >
          EDHREC
        </a>{" "}
        &amp;{" "}
        <a href="https://scryfall.com" target="_blank" rel="noreferrer">
          Scryfall
        </a>
        . Card images © Wizards of the Coast. Unofficial fan project. ·{" "}
        <a href="/privacy" onClick={navPrivacy}>
          Privacy Policy
        </a>

      </footer>
    </div>
  );
}
