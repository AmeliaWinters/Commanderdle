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

export type Tier = "common" | "uncommon" | "rare" | "mythic" | "theCreator";

/**
 * Ascending rank so `>=` comparisons gate higher tiers. `theCreator` sits above every
 * purchasable tier: it's the owner/collaborator tier, granted manually and never
 * bought or expired, so it always outranks (and therefore unlocks) everything.
 */
export const TIER_RANK: Record<Tier, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3,
  theCreator: 4,
};

export function isTier(v: unknown): v is Tier {
  return (
    v === "common" ||
    v === "uncommon" ||
    v === "rare" ||
    v === "mythic" ||
    v === "theCreator"
  );
}

/** Short capitalised tier names (for supporter copy). */
export const TIER_META_MIN: Record<Tier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
  theCreator: "The Creator",
};

/** The avatar new accounts start with (a well-known top commander). */
export const DEFAULT_AVATAR = "Atraxa, Praetors' Voice";

/**
 * Alternate-art avatars are stored as `"<commander name>#<art id>"`. The bare name renders
 * the commander's default (top-500) art; a suffixed value renders a specific alternate
 * printing's art (deduped by Scryfall illustration id, so only *meaningfully different* arts
 * — never mere foils — get an id). Kept as a single string so it flows through the DB, the
 * profile/leaderboard APIs and AvatarImage untouched; only this module and the gallery need
 * to understand the split. Alternate arts are a Mythic+/The Creator-only cosmetic.
 */
export const AVATAR_VARIANT_SEP = "#";

/** Split an avatar value into its commander name and optional alternate-art id. */
export function splitAvatar(avatar: string): {
  name: string;
  variant: string | null;
} {
  const i = avatar.indexOf(AVATAR_VARIANT_SEP);
  if (i === -1) return { name: avatar, variant: null };
  return { name: avatar.slice(0, i), variant: avatar.slice(i + 1) || null };
}

/** Build an avatar value from a commander name and optional alternate-art id. */
export function makeAvatar(name: string, variant: string | null): string {
  return variant ? `${name}${AVATAR_VARIANT_SEP}${variant}` : name;
}

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

/** Whether `avatar` may be equipped by a player at the given tier. */
export function isAvatarUnlocked(avatar: string, tier: Tier): boolean {
  const { name, variant } = splitAvatar(avatar);
  // Alternate-art printings are a Mythic+/The Creator perk (and only visible to them).
  if (variant) return TIER_RANK[tier] >= TIER_RANK.mythic;
  return TIER_RANK[tier] > 0 || FREE_AVATARS.includes(name);
}

/**
 * Whether a tier may choose a custom flare colour (the colour their username +
 * profile theme render in). Mythic and above — the owner/The Creator tier inherits it.
 * Imported by the Worker too, to gate the update, so keep it free of client imports.
 */
export function canChooseNameColor(tier: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK.mythic;
}

/**
 * Validate a user-chosen flare colour: a 3- or 6-digit CSS hex (e.g. `#f80` or
 * `#ff8800`). Deliberately strict so the value can be dropped straight into a
 * `color:` / CSS variable without escaping. `null` clears it (back to the tier colour).
 */
export function isValidNameColor(v: unknown): v is string {
  return (
    typeof v === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
  );
}

/**
 * Mothly donation for each tier
 */
export const TIER_THRESHOLDS_GBP: Record<
  "uncommon" | "rare" | "mythic",
  number
> = {
  uncommon: 2,
  rare: 5,
  mythic: 10,
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
  // Bound the length to a real card-name range and restrict to the characters that
  // actually occur in commander names (letters incl. accents, digits, spaces and the
  // handful of punctuation marks Wizards uses). We still don't check membership, but
  // this keeps a junk string out of a public aria-label / an empty avatar ring.
  if (typeof name !== "string") return false;
  const { name: base, variant } = splitAvatar(name);
  if (base.length < 1 || base.length > 40) return false;
  if (!/^[\p{L}\p{N} '",.:!?&/()+-]+$/u.test(base)) return false;
  // The alternate-art id is a short slice of a Scryfall illustration UUID (hex only).
  if (variant !== null && !/^[a-f0-9]{1,40}$/.test(variant)) return false;
  return true;
}
