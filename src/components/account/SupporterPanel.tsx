import type { CSSProperties } from "react";
import { TIER_META, type AccountUser } from "../../lib/auth";
import { TIER_RANK, TIER_THRESHOLDS_GBP } from "../../lib/avatars";

/** The "Support commandle" panel on the account page: a Ko-fi pitch with tier chips
 *  for non-supporters, or a thank-you once a supporter tier is unlocked. */
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
            If Commandle has become part of your morning, a tip on Ko-fi would
            mean a lot. You will also get supporter cosmetics. Simply use the
            email linked with your OAuth account (Google/Discord) to donate and
            the benefits will appear on your next visit.
          </p>
          <div className="tier-chips">
            {(["uncommon", "rare", "mythic"] as const).map((t) => (
              <div
                key={t}
                className="tier-chip"
                style={{ "--tier-color": TIER_META[t].color } as CSSProperties}
              >
                <i
                  className={`${TIER_META[t].keyrune} tier-chip-gem`}
                  aria-hidden="true"
                />
                <span className="tier-chip-price">
                  £{TIER_THRESHOLDS_GBP[t]}
                </span>
                <span className="tier-chip-label">{TIER_META[t].label}</span>
              </div>
            ))}
          </div>
        </>
      ) : user.tier === "creator" ? (
        <p>
          You have the{" "}
          <strong style={{ color: tierColor }}>Creator</strong> tier — every
          cosmetic is unlocked, always. {"<"}3
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
      <a
        className="account-btn account-btn-primary account-kofi"
        href="https://ko-fi.com/commandle"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span aria-hidden="true">☕</span>
        {TIER_RANK[user.tier] === 0 ? "Support on Ko-fi" : "Support again on Ko-fi"}
      </a>
    </div>
  );
}
