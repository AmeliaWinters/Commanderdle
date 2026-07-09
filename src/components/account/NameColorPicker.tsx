import { useEffect, useRef, useState } from "react";
import { FaPen, FaRotateLeft } from "react-icons/fa6";
import { isValidNameColor } from "../../lib/avatars";

const PRESETS = [
  "#F07E01",
  "#e23b3b",
  "#f76fb0",
  "#b061ff",
  "#4aa3ff",
  "#2fcf9e",
  "#4fd14f",
];

export default function NameColorPicker({
  value,
  defaultColor,
  onSave,
  onPreview,
}: {
  value: string | null;
  defaultColor: string;
  onSave: (color: string | null) => void | Promise<void>;
  onPreview: (color: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const current = (value ?? defaultColor).toLowerCase();

  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value, defaultColor]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const commit = () => {
      onPreview(null);
      setDraft(null);
      if (isValidNameColor(el.value)) onSave(el.value);
    };
    el.addEventListener("change", commit);
    return () => el.removeEventListener("change", commit);
  }, [onSave, onPreview]);

  const customActive =
    !!value && !PRESETS.some((c) => c.toLowerCase() === current);

  return (
    <div className="name-flare">
      <span className="name-flare-label">Profile flare</span>
      <div
        className="name-flare-chips"
        role="group"
        aria-label="Name flare colour"
      >
        {PRESETS.map((c) => (
          <button
            key={c}
            className={`name-flare-chip${
              current === c.toLowerCase() ? " is-active" : ""
            }`}
            style={{ background: c }}
            aria-label={`Use ${c}`}
            aria-pressed={current === c.toLowerCase()}
            title={c}
            onClick={() => onSave(c)}
          />
        ))}
        <label
          className={`name-flare-chip name-flare-custom${
            customActive ? " is-active" : ""
          }`}
          style={customActive ? { background: value! } : undefined}
          title="Pick a custom colour"
        >
          <input
            ref={inputRef}
            type="color"
            value={
              draft ?? (isValidNameColor(value ?? "") ? value! : defaultColor)
            }
            aria-label="Pick a custom colour"
            onChange={(e) => {
              setDraft(e.target.value);
              onPreview(e.target.value);
            }}
          />
          <FaPen aria-hidden="true" />
        </label>
        {value && (
          <button
            className="name-flare-chip name-flare-reset"
            aria-label="Reset to tier colour"
            title="Reset to tier colour"
            onClick={() => onSave(null)}
          >
            <FaRotateLeft aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
