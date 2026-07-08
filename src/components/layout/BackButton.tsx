import { FaArrowLeft } from "react-icons/fa6";
import { navigateToPath } from "../../lib/router";

interface Props {
  /** Path to navigate to when pressed. Ignored when `onClick` is given. */
  to?: string;
  /** Visible label (hidden on small screens, leaving just the arrow). */
  label: string;
  /** Accessible name; defaults to the label. */
  ariaLabel?: string;
  /** Custom handler (e.g. history back). Overrides `to`. */
  onClick?: () => void;
}

/**
 * Shared "go back" control used by the archive, side games and content pages.
 * Rendered on its own row beneath the masthead title (see `.back-btn` in archive.css
 * + the flex-column `.app-header` in header.css), so it never overlaps the title.
 */
export default function BackButton({ to, label, ariaLabel, onClick }: Props) {
  return (
    <button
      className="back-btn"
      onClick={onClick ?? (() => navigateToPath(to ?? "/"))}
      aria-label={ariaLabel ?? label}
    >
      <FaArrowLeft />
      <span>{label}</span>
    </button>
  );
}
