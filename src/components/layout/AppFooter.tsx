import { navigateToPath, ARCHIVE_PATH } from "../../lib/router";
import AdBanner from "../AdBanner";
import meta from "../../data/commanders.meta.json";

function formatRefreshed(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  isArchive: boolean;
  archiveDate?: string;
}

export default function AppFooter({ isArchive }: Props) {
  const refreshed = formatRefreshed(meta.generatedAt);

  function navTo(path: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      navigateToPath(path);
    };
  }

  return (
    <div className="bottom-bar">
      {/*<AdBanner /> */}
      <footer className="app-footer">
        <p className="footer-meta">
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
            <></>
          )}
        </p>
        <span className="footer-data">
          Rankings from{" "}
          <a
            href="https://edhrec.com/commanders"
            target="_blank"
            rel="noreferrer"
          >
            EDHREC
          </a>
          , card data from{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          .{refreshed ? ` Last updated ${refreshed}` : ""}
        </span>
        <span className="footer-fanpolicy">
          Commandle is unofficial Fan Content permitted under the{" "}
          <a
            href="https://company.wizards.com/en/legal/fancontentpolicy"
            target="_blank"
            rel="noreferrer"
          >
            WotC Fan Content Policy
          </a>
          . Not approved or endorsed by WotC. © Wizards of the Coast LLC.
        </span>
        <nav className="footer-links" aria-label="Site pages">
          <a href="/about" onClick={navTo("/about")}>
            About
          </a>
          <a href="/how-to-play" onClick={navTo("/how-to-play")}>
            How to Play
          </a>
          <a href="/faq" onClick={navTo("/faq")}>
            FAQ
          </a>

          <a href="/terms" onClick={navTo("/terms")}>
            Terms
          </a>
          <a href="/privacy" onClick={navTo("/privacy")}>
            Privacy Policy
          </a>
          <a href="/contact" onClick={navTo("/contact")}>
            Contact
          </a>
        </nav>
      </footer>
    </div>
  );
}
