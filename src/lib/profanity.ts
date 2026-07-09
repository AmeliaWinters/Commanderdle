
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

const SOFT_RE = new RegExp(`\\b(?:${SOFT_WORDS.join("|")})\\b`);

export function containsProfanity(name: string): boolean {
  const folded = fold(name);
  const compact = folded.replace(/[^a-z]/g, "");
  if (HARD_SLURS.some((word) => compact.includes(word))) return true;
  const spaced = folded.replace(/[^a-z]/g, " ");
  return SOFT_RE.test(spaced);
}
