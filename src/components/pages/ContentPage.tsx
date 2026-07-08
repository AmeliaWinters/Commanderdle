import { useEffect, type ReactNode } from "react";
import { navigateToPath } from "../../lib/router";
import AppFooter from "../layout/AppFooter";
import BackButton from "../layout/BackButton";

interface Props {
  /** Full document + og title, e.g. "Commandle - About". */
  title: string;
  /** Meta description for this page (SEO). */
  description: string;
  /** Absolute canonical URL for this page. */
  canonical: string;
  /** Back control override. Defaults to "Back to today" → "/". */
  back?: { label: string; to?: string; onClick?: () => void };
  /** Suppress the header's back button (e.g. the account page renders its own below
   *  the mode-tabs). */
  hideBack?: boolean;
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
  back,
  hideBack = false,
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
        {!hideBack && (
          <BackButton
            to={back?.to ?? "/"}
            label={back?.label ?? "Back to today"}
            onClick={back?.onClick}
          />
        )}
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

      <AppFooter isArchive={false} />

      <footer className="app-footer"></footer>
    </div>
  );
}
