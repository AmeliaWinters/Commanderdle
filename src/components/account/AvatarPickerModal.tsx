import { useRef } from "react";
import { FaXmark } from "react-icons/fa6";
import AvatarGrid from "./AvatarGrid";
import { useModalFocus } from "../../lib/useModalFocus";
import type { Tier } from "../../lib/avatars";

interface Props {
  current: string;
  tier: Tier;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function AvatarPickerModal({ current, tier, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocus(ref, onClose);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal avatar-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your avatar"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Choose your avatar</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <FaXmark />
          </button>
        </div>
        <AvatarGrid
          current={current}
          tier={tier}
          onSelect={(name) => {
            onSelect(name);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
