/**
 * Lightweight username profanity / slur guard. Deliberately conservative: it blocks a
 * curated list of slurs and obvious profanity (plus common leet-speak spellings) so
 * public leaderboard names stay clean, without pretending to be an exhaustive filter.
 *
 * Dependency-free so both the client (instant feedback) and the Worker (authoritative
 * check in functions/api/auth/handlers.ts) can import it.
 */

/** Base list of disallowed substrings, lower-cased. Kept terse on purpose. */
const BLOCKED: readonly string[] = [
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "chink",
  "spic",
  "kike",
  "tranny",
  "coon",
  "wetback",
  "gook",
  "paki",
  "beaner",
  "cunt",
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "rape",
  "nazi",
  "hitler",
];

/** Fold common leet-speak substitutions back to letters so "n1gg3r" still trips. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");
}

/** True if the username contains a blocked slur / profanity. */
export function containsProfanity(name: string): boolean {
  const n = normalize(name);
  return BLOCKED.some((word) => n.includes(word));
}
