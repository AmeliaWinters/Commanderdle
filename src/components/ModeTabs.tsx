import { FaCheck } from "react-icons/fa6";
import type { Mode } from "../types/commander";
import { MODE_LIST } from "./modeList";
import { MODE_PATHS } from "../lib/router";
import { isModeCompletedToday } from "../lib/stats";
import { todayKey } from "../lib/dailyAnswer";

interface Props {
  mode: Mode | null;
  onNavigate: (m: Mode) => void;
  completedSignal?: unknown;
  isCompleted?: (mode: Mode) => boolean;
  hrefFor?: (mode: Mode) => string;
}

export default function ModeTabs({
  mode,
  onNavigate,
  completedSignal,
  isCompleted,
  hrefFor,
}: Props) {
  const today = todayKey();
  return (
    <nav className="mode-tabs">
      {MODE_LIST.map((m) => {
        void completedSignal; // recompute when a game finishes
        const completed = isCompleted
          ? isCompleted(m.id)
          : isModeCompletedToday(m.id, today);
        return (
          <a
            key={m.id}
            href={hrefFor ? hrefFor(m.id) : MODE_PATHS[m.id]}
            className={`mode-tab${mode === m.id ? " active" : ""}`}
            aria-current={mode === m.id ? "page" : undefined}
            onClick={(e) => {
              // Let modified clicks (new tab/window) and non-primary buttons behave natively.
              if (
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0
              )
                return;
              e.preventDefault();
              onNavigate(m.id);
            }}
          >
            <span className="mode-icon">
              <m.Icon />
            </span>
            <span className="mode-label">{m.label}</span>
            {completed && (
              <span
                className="mode-complete"
                title="You completed today's puzzle"
                aria-label="Completed today"
              >
                <FaCheck />
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
