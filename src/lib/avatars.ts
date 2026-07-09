
export type Tier = "common" | "uncommon" | "rare" | "mythic" | "theCreator";

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

export const TIER_META_MIN: Record<Tier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
  theCreator: "The Creator",
};

export const DEFAULT_AVATAR = "Atraxa, Praetors' Voice";

export const AVATAR_VARIANT_SEP = "#";

export function splitAvatar(avatar: string): {
  name: string;
  variant: string | null;
} {
  const i = avatar.indexOf(AVATAR_VARIANT_SEP);
  if (i === -1) return { name: avatar, variant: null };
  return { name: avatar.slice(0, i), variant: avatar.slice(i + 1) || null };
}

export function makeAvatar(name: string, variant: string | null): string {
  return variant ? `${name}${AVATAR_VARIANT_SEP}${variant}` : name;
}

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

export function isAvatarUnlocked(avatar: string, tier: Tier): boolean {
  const { name, variant } = splitAvatar(avatar);
  if (variant) return TIER_RANK[tier] >= TIER_RANK.mythic;
  return TIER_RANK[tier] > 0 || FREE_AVATARS.includes(name);
}

export function canChooseNameColor(tier: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK.mythic;
}

export function isValidNameColor(v: unknown): v is string {
  return (
    typeof v === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
  );
}

export const TIER_THRESHOLDS_GBP: Record<
  "uncommon" | "rare" | "mythic",
  number
> = {
  uncommon: 2,
  rare: 5,
  mythic: 10,
};

export function tierForTotal(totalGbp: number): Tier {
  if (totalGbp >= TIER_THRESHOLDS_GBP.mythic) return "mythic";
  if (totalGbp >= TIER_THRESHOLDS_GBP.rare) return "rare";
  if (totalGbp >= TIER_THRESHOLDS_GBP.uncommon) return "uncommon";
  return "common";
}

export function isValidAvatar(name: unknown): name is string {
  if (typeof name !== "string") return false;
  const { name: base, variant } = splitAvatar(name);
  if (base.length < 1 || base.length > 40) return false;
  if (!/^[\p{L}\p{N} '",.:!?&/()+-]+$/u.test(base)) return false;
  if (variant !== null && !/^[a-f0-9]{1,40}$/.test(variant)) return false;
  return true;
}
