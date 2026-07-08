/**
 * Deterministic 32-bit string hash (xmur3-style). Kept in its own dependency-free
 * module so it can be shared by the client's daily-answer seeding (src/lib/dailyAnswer.ts,
 * which also seeds Higher/Lower's PRNG) AND the build script that freezes each day's answer
 * (scripts/build-data.ts) — both MUST hash identically or a frozen archive answer would
 * disagree with what players were served. Do not change this formula lightly.
 */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}
