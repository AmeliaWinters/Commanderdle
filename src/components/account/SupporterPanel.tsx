import type { CSSProperties } from "react";
import { TIER_META, type AccountUser } from "../../lib/auth";
import { TIER_RANK, TIER_THRESHOLDS_GBP } from "../../lib/avatars";
import KofiButton from "../games/KofiButton";

const TIER_PERKS: Record<"uncommon" | "rare" | "mythic", string[]> = {
  uncommon: [
    "Access to top 100 standard printing avatars",
    "Uncommon supporter badge",
    "Uncommon supporter flare",
    "No ads",
  ],
  rare: [
    "Access to top 500 standard printing avatars",
    "Rare supporter badge",
    "Rare supporter account flare",
    "No ads",
  ],
  mythic: [
    "Access to alternative printings as avatars",
    "Mythic rare account badge",
    "Custom account flare colour",
    "Foil animation on profile, avatar, and name",
    "No ads",
  ],
};

export default function SupporterPanel({
  user,
  tierColor,
}: {
  user: AccountUser;
  tierColor: string;
}) {
  return (
    <div className="account-panel account-tier">
      <h3>Support commandle</h3>
      {TIER_RANK[user.tier] === 0 ? (
        <>
          <p>
            If Commandle has become part of your morning, a membership on Ko-fi
            would mean a lot and it unlocks supporter cosmetics. Commandle is
            integrated with the Ko-fi API, so just use the email linked with
            your OAuth account (Google/Discord) to join and your tier appears on
            your next visit.
          </p>
          <div className="tier-cards">
            {(["uncommon", "rare", "mythic"] as const).map((t) => (
              <div
                key={t}
                className="tier-card"
                style={{ "--tier-color": TIER_META[t].color } as CSSProperties}
              >
                <div className="tier-card-head">
                  <i
                    className={`${TIER_META[t].keyrune} tier-card-gem`}
                    aria-hidden="true"
                  />
                  <span className="tier-card-name">
                    {TIER_META[t].label} Supporter
                  </span>
                  <span className="tier-card-price">
                    £{TIER_THRESHOLDS_GBP[t]}
                    <small>/mo</small>
                  </span>
                </div>
                <ul className="tier-card-perks">
                  {TIER_PERKS[t].map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : user.tier === "theCreator" ? (
        <p>
          You have the <strong style={{ color: tierColor }}>The Creator</strong>{" "}
          tier. Hello, mother.
        </p>
      ) : (
        <p>
          You're a{" "}
          <strong style={{ color: tierColor }}>
            {TIER_META[user.tier].label}
          </strong>{" "}
          supporter. Thank you for keeping the lights on! {"<"}3
        </p>
      )}
      <div style={{ marginTop: "1rem" }}>
        <KofiButton />
      </div>
    </div>
  );
}
