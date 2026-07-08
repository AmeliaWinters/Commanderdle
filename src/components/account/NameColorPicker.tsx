import { useEffect, useRef, useState } from "react";
import { FaPen, FaRotateLeft } from "react-icons/fa6";
import { isValidNameColor } from "../../lib/avatars";

/**
 * Mythic+ cosmetic, rendered inside the account hero: pick the colour your
 * username + profile theme render in (the tier gem always keeps its own rarity
 * colour). A row of preset chips that save on tap, a rainbow "custom" chip with
 * an edit pencil hiding the native colour input, and a reset chip back to the
 * tier default. While the native picker is open the hero name previews live
 * via onPreview.
 */

const PRESETS = [
  "#F07E01", // mythic orange (the default)
  "#e23b3b", // red
  "#f76fb0", // pink
  "#b061ff", // purple
  "#4aa3ff", // blue
  "#2fcf9e", // teal
  "#4fd14f", // green
];

export default function NameColorPicker({
  value,
  defaultColor,
  onSave,
  onPreview,
}: {
  /** The saved custom colour, or null when using the tier default. */
  value: string | null;
  /** The tier's default colour (shown as the "reset" target). */
  defaultColor: string;
  onSave: (color: string | null) => void | Promise<void>;
  /** Live-preview a colour on the hero name while the native picker is open. */
  onPreview: (color: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const current = (value ?? defaultColor).toLowerCase();

  // Local draft for the native picker: while the OS dialog is open the input is
  // controlled by this, not by the saved value, so React doesn't reset it
  // between `input` events mid-drag.
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value, defaultColor]);

  // React's onChange maps to the `input` event (fires while dragging) — good for
  // preview. The native `change` event fires once the picker is committed, so
  // that's when we save.
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
