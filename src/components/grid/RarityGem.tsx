import { TIER_LABELS, type GuessTier } from "../../lib/gridRarity";

interface Props {
  tier: GuessTier;
  /** Pixel size of the gem. */
  size?: number;
  className?: string;
}

/**
 * The little set-symbol gem MTG prints in a card's type line to show its rarity:
 * black for common, silver for uncommon, gold for rare, orange for mythic. Rendered
 * with the open-licensed Keyrune icon font — the generic Magic set symbol tinted per
 * tier with Keyrune's metallic rarity gradient, so it reads as the real thing.
 */
export default function RarityGem({ tier, size = 16, className }: Props) {
  return (
    <i
      className={`ss ss-${tier} ss-grad rarity-gem${className ? ` ${className}` : ""}`}
      style={{ fontSize: size }}
      role="img"
      aria-label={TIER_LABELS[tier]}
    />
  );
}
