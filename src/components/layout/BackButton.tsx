import { FaArrowLeft } from "react-icons/fa6";
import { navigateToPath } from "../../lib/router";

interface Props {
  to?: string;
  label: string;
  ariaLabel?: string;
  onClick?: () => void;
}

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
