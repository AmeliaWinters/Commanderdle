import { TIER_LABELS, type GuessTier } from "../../lib/gridRarity";

interface Props {
  tier: GuessTier;
  size?: number;
  className?: string;
}

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
