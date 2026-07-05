import { useEffect, type ReactNode } from "react";
import { navigateToPath } from "../../lib/router";

interface Props {
  /** Full document + og title, e.g. "Commandle — About". */
  title: string;
  /** Meta description for this page (SEO). */
  description: string;
  /** Absolute canonical URL for this page. */
  canonical: string;
  children: ReactNode;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

/**
 * Shared shell for the static content/landing pages (About, How to Play, FAQ,
 * Privacy). Owns its own SEO/social meta because these routes sit outside the
 * mode system that router.ts manages.
 */
export default function ContentPage({
  title,
  description,
  canonical,
  children,
}: Props) {
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setCanonical(canonical);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
  }, [title, description, canonical]);

  return (
    <div className="content-page">
      <header className="app-header">
        <h1>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateToPath("/");
            }}
          >
            Comman<span className="accent">dle</span>
          </a>
        </h1>
      </header>

      <article className="content-body">{children}</article>

      <nav className="content-nav" aria-label="Site pages">
        <a href="/" onClick={link("/")}>
          Play
        </a>
        <a href="/how-to-play" onClick={link("/how-to-play")}>
          How to play
        </a>
        <a href="/faq" onClick={link("/faq")}>
          FAQ
        </a>
        <a href="/about" onClick={link("/about")}>
          About
        </a>
        <a href="/contact" onClick={link("/contact")}>
          Contact
        </a>
        <a href="/terms" onClick={link("/terms")}>
          Terms
        </a>
        <a href="/privacy" onClick={link("/privacy")}>
          Privacy
        </a>
      </nav>

      <footer className="app-footer">
        <a href="/" onClick={link("/")}>
          ← Back to the game
        </a>
      </footer>
    </div>
  );
}

/** Intercept an in-app link so it routes client-side instead of reloading. */
function link(path: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    navigateToPath(path);
  };
}
