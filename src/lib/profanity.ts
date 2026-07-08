/**
 * Lightweight username profanity / slur guard. Deliberately conservative: it blocks a
 * curated list of slurs and obvious profanity (plus common leet-speak spellings) so
 * public leaderboard names stay clean, without pretending to be an exhaustive filter.
 *
 * Two lists, matched differently, to dodge the "Scunthorpe problem" — flagging innocent
 * names that merely *contain* a rude substring (Scunthorpe, raccoon, cockpit, therapist,
 * pussycat, flame retardant, …):
 *
 *  - HARD_SLURS are matched as a substring on a compacted (leet-folded, letters-only)
 *    form, so they're caught even when padded ("xXniggerXx"). These almost never appear
 *    inside an ordinary word, so substring matching is safe.
 *  - SOFT_WORDS are common profanities that DO hide inside real words, so they're matched
 *    only on word boundaries. "cunt" alone is blocked; "Scunthorpe" sails through. The
 *    trade-off is that a run-together compound ("shitface") can slip past — an acceptable
 *    gap for a filter that already disclaims being exhaustive, and one that keeps real
 *    names usable.
 *
 * Dependency-free so both the client (instant feedback) and the Worker (authoritative
 * check in functions/api/auth/handlers.ts) can import it.
 */

/** Slurs with negligible overlap with ordinary words — safe to match anywhere. */
const HARD_SLURS: readonly string[] = [
  "nigger",
  "nigga",
  "faggot",
  "kike",
  "chink",
  "gook",
  "tranny",
  "wetback",
  "retard",
  "pussy",
  "whore",
  "beaner",
  "rape",
  "nazi",
  "hitler",
];

/** Rude words that hide inside innocent ones — only matched as whole words. */
const SOFT_WORDS: readonly string[] = [
  "fag",
  "coon",
  "spic",
  "paki",
  "cunt",
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "dick",
  "cock",
  "slut",
];

/** Fold common leet-speak substitutions back to letters so "n1gg3r" still trips. */
function fold(name: string): string {
  return name
    .toLowerCase()
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
}

/** Whole-word matcher for the soft list, built once (`\b(word|word|…)\b`). */
const SOFT_RE = new RegExp(`\\b(?:${SOFT_WORDS.join("|")})\\b`);

/** True if the username contains a blocked slur / profanity. */
export function containsProfanity(name: string): boolean {
  const folded = fold(name);
  // Hard slurs: strip everything but letters so padding/punctuation can't hide them.
  const compact = folded.replace(/[^a-z]/g, "");
  if (HARD_SLURS.some((word) => compact.includes(word))) return true;
  // Soft words: keep separators (as spaces) so word boundaries survive, then match whole
  // words only — "Scunthorpe" keeps its 'cunt', "cockpit" its 'cock', unflagged.
  const spaced = folded.replace(/[^a-z]/g, " ");
  return SOFT_RE.test(spaced);
}
