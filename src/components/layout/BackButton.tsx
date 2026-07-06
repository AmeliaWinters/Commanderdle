import { FaArrowLeft } from "react-icons/fa6";
import { navigateToPath } from "../../lib/router";

interface Props {
  /** Path to navigate to when pressed. */
  to: string;
  /** Visible label (hidden on small screens, leaving just the arrow). */
  label: string;
  /** Accessible name; defaults to the label. */
  ariaLabel?: string;
}

/**
 * Shared "go back" control used by the archive, side games and content pages.
 * Sits top-left of the header (see `.back-btn` in archive.css).
 */
export default function BackButton({ to, label, ariaLabel }: Props) {
  return (
    <button
      className="back-btn"
      onClick={() => navigateToPath(to)}
      aria-label={ariaLabel ?? label}
    >
      <FaArrowLeft />
      <span>{label}</span>
    </button>
  );
}
