/**
 * Profile avatars. An avatar is simply the *name* of a commander in the dataset; the
 * client resolves its art from COMMANDERS_BY_NAME, so no art URLs live here. Free
 * (tier `none`) players may only equip the FREE_AVATARS below; any supporter
 * tier unlocks the full top-500 gallery, alongside the other cosmetics (coloured
 * username, rarity gem and tier-coloured avatar ring).
 *
 * Kept free of client-only imports (React, DOM) — the Worker imports it too, to
 * lightly validate an incoming avatar.
 */

export type Tier = "common" | "uncommon" | "rare" | "mythic";

/** Ascending rank so `>=` comparisons gate higher tiers. */
export const TIER_RANK: Record<Tier, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3,
};

export function isTier(v: unknown): v is Tier {
  return v === "common" || v === "uncommon" || v === "rare" || v === "mythic";
}

/** Short capitalised tier names (for supporter copy). */
export const TIER_META_MIN: Record<Tier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
};

/** The avatar new accounts start with (a well-known top commander). */
export const DEFAULT_AVATAR = "Atraxa, Praetors' Voice";

/**
 * The only avatars a non-supporter (tier `none`) may equip. Any supporter tier
 * unlocks the full top-500 gallery — gating the rest is the whole point of the
 * cosmetic. These are the 20 most popular commanders (top of the EDHREC rank); the
 * default avatar is deliberately one of them so a fresh account starts on a free avatar.
 */
export const FREE_AVATARS: readonly string[] = [
  "The Ur-Dragon",
  "Edgar Markov",
  "Y'shtola, Night's Blessed",
  "Atraxa, Praetors' Voice",
  "Krenko, Mob Boss",
  "Kaalia of the Vast",
  "Ms. Bumbleflower",
  "Vivi Ornitier",
  "Sauron, the Dark Lord",
  "Teval, the Balanced Scale",
  "Pantlaza, Sun-Favored",
  "Fire Lord Azula",
  "Lathril, Blade of the Elves",
  "Giada, Font of Hope",
  "The Wise Mothman",
  "Yuriko, the Tiger's Shadow",
  "Jodah, the Unifier",
  "Kenrith, the Returned King",
  "Nekusar, the Mindrazer",
  "Baylen, the Haymaker",
];

/** Whether `name` may be equipped by a player at the given tier. */
export function isAvatarUnlocked(name: string, tier: Tier): boolean {
  return TIER_RANK[tier] > 0 || FREE_AVATARS.includes(name);
}

/**
 * Mothly donation for each tier
 */
export const TIER_THRESHOLDS_GBP: Record<Exclude<Tier, "common">, number> = {
  uncommon: 5,
  rare: 10,
  mythic: 20,
};

/** Map a cumulative donation total (GBP) to the highest tier it unlocks. */
export function tierForTotal(totalGbp: number): Tier {
  if (totalGbp >= TIER_THRESHOLDS_GBP.mythic) return "mythic";
  if (totalGbp >= TIER_THRESHOLDS_GBP.rare) return "rare";
  if (totalGbp >= TIER_THRESHOLDS_GBP.uncommon) return "uncommon";
  return "common";
}

/**
 * Light server-side validation for an avatar value. We don't ship the full commander
 * list into the Worker, so we bound the shape rather than checking membership — the
 * client only ever offers real commanders, and an unknown value just renders the
 * fallback silhouette (it's cosmetic, and only ever shown as that player's own icon).
 */
export function isValidAvatar(name: unknown): name is string {
  return typeof name === "string" && name.length >= 1 && name.length <= 80;
}
