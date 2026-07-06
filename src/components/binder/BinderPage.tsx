import { useEffect, useMemo, useState } from "react";
import { COMMANDERS } from "../../lib/commanders";
import { loadCollection, subscribeCollection } from "../../lib/collection";
import { colorIdentityName } from "../../lib/colorNames";
import { GAMES_PATH } from "../../lib/router";
import CardBackdrop from "../CardBackdrop";
import LogoTitle from "../layout/LogoTitle";
import GameSettingsMenu from "../layout/GameSettingsMenu";
import BackButton from "../layout/BackButton";
import AppFooter from "../layout/AppFooter";
import BinderCard from "./BinderCard";

const WUBRG = ["W", "U", "B", "R", "G"] as const;

type Shown = "all" | "found" | "missing";

/** Fold a name for search the same way the guess box does. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * The Binder: every commander in the pool laid out like a trade binder.
 * Found ones sit face-up; the rest stay face-down as card backs until the
 * player guesses them correctly in any mode.
 */
export default function BinderPage() {
  useEffect(() => {
    document.title = "Commandle - The Binder";
  }, []);

  const [collection, setCollection] = useState(() => loadCollection());
  useEffect(() => subscribeCollection(() => setCollection(loadCollection())), []);

  const [query, setQuery] = useState("");
  const [pips, setPips] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<Shown>("all");

  const foundCount = useMemo(
    () => COMMANDERS.filter((c) => collection[c.name]).length,
    [collection],
  );

  const cards = useMemo(() => {
    const q = fold(query);
    return COMMANDERS.filter((c) => {
      const found = Boolean(collection[c.name]);
      if (shown === "found" && !found) return false;
      if (shown === "missing" && found) return false;
      if (q && !fold(c.name).includes(q)) return false;
      if (pips.size > 0) {
        // "C" pip = colorless only; letters must all be within the identity.
        if (pips.has("C")) return c.colorIdentity.length === 0;
        for (const p of pips) if (!c.colorIdentity.includes(p)) return false;
      }
      return true;
    });
  }, [collection, query, pips, shown]);

  function togglePip(p: string) {
    setPips((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else {
        // Colorless is exclusive of the five colors.
        if (p === "C") next.clear();
        else next.delete("C");
        next.add(p);
      }
      return next;
    });
  }

  const pct = COMMANDERS.length
    ? Math.round((foundCount / COMMANDERS.length) * 100)
    : 0;

  return (
    <div className="app">
      <CardBackdrop />
      <header className="app-header binder-header">
        <BackButton to={GAMES_PATH} label="All games" />
        <GameSettingsMenu />
        <LogoTitle ariaLabel="commandle">
          Comman<span className="accent">dle</span>
        </LogoTitle>
        <p className="mode-subtitle">The Binder</p>
        <p className="tagline">
          Every commander you've named goes in the binder. Gotta guess 'em all.
        </p>
      </header>

      <main className="play-area binder-area">
        <section className="binder-about">
          <p>
            The Binder is your lifetime collection. Every commander in the
            Commandle pool has a slot here, face-down. Guess a commander
            correctly in any game — daily or practice, any mode — and its card
            flips face-up in your binder for good. Fill every slot to complete
            the collection.
          </p>
        </section>

        <section className="binder-progress" aria-label="Collection progress">
          <div className="binder-progress-line">
            <span className="binder-progress-count">
              {foundCount} / {COMMANDERS.length}
            </span>{" "}
            commanders found · {pct}%
          </div>
          <div
            className="binder-progress-bar"
            role="progressbar"
            aria-valuenow={foundCount}
            aria-valuemin={0}
            aria-valuemax={COMMANDERS.length}
          >
            <div className="binder-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </section>

        <div className="binder-controls">
          <input
            className="binder-search"
            type="search"
            placeholder="Search commanders…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commanders"
          />
          <div className="binder-pips" role="group" aria-label="Filter by color">
            {[...WUBRG, "C"].map((p) => (
              <button
                key={p}
                className={`binder-pip ${pips.has(p) ? "active" : ""}`}
                onClick={() => togglePip(p)}
                aria-pressed={pips.has(p)}
                title={colorIdentityName(p === "C" ? [] : [p]) ?? p}
              >
                <img src={`/mana/${p}.svg`} alt={p} />
              </button>
            ))}
          </div>
          <div className="binder-shown" role="group" aria-label="Show">
            {(["all", "found", "missing"] as const).map((s) => (
              <button
                key={s}
                className={`binder-shown-btn ${shown === s ? "active" : ""}`}
                onClick={() => setShown(s)}
                aria-pressed={shown === s}
              >
                {s === "all" ? "All" : s === "found" ? "Found" : "Missing"}
              </button>
            ))}
          </div>
        </div>

        <div className="binder-grid">
          {cards.map((c) => (
            <BinderCard key={c.name} commander={c} entry={collection[c.name]} />
          ))}
        </div>
        {cards.length === 0 && (
          <p className="binder-empty">No commanders match those filters.</p>
        )}
      </main>

      <AppFooter isArchive={false} />
    </div>
  );
}
