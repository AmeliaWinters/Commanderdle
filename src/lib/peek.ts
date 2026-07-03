import type { Commander, Mode } from "../types/commander";
import { poolFor } from "./dailyAnswer";
import { possiblePool, synergyPool, quotePool } from "./deduce";

export interface Peek {
  pool: Commander[];
  unlockAt: number;
  hint: string;
}

/**
 * "Possible commanders" peek. The deduction modes expose a pool filtered to the
 * commanders still consistent with the clues revealed so far, unlocked after a
 * few wrong guesses so it helps late-game without trivializing the start.
 */
export function getPeek(
  mode: Mode,
  guesses: Commander[],
  answer: Commander,
  wrongGuesses: number,
): Peek | null {
  switch (mode) {
    case "classic":
      return {
        pool: possiblePool(poolFor("classic"), guesses, answer),
        unlockAt: 4,
        hint: "See the commanders still possible by popularity",
      };
    case "synergy": {
      const revealed = answer.synergyCards.slice(
        0,
        Math.min(answer.synergyCards.length, wrongGuesses + 1),
      );
      return {
        pool: synergyPool(poolFor("synergy"), revealed),
        unlockAt: 3,
        hint: "See the commanders still possible by the revealed cards' colors",
      };
    }
    case "quote":
      return {
        pool: quotePool(poolFor("quote"), answer),
        unlockAt: 3,
        hint: "See the commanders that share this color identity",
      };
    default:
      return null;
  }
}
