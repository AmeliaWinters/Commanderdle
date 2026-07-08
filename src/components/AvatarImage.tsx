import { useEffect, useState } from "react";
import { commanderByName, ensureVaultLoaded } from "../lib/commanders";

interface Props {
  /** Avatar value = a commander name (see src/lib/avatars.ts). */
  avatar: string;
  size?: number;
  className?: string;
  /** Overlay the animated holographic sheen reserved for Mythic Rare supporters. */
  foil?: boolean;
}

/**
 * A player's commander-art avatar, rendered from the art crop of the commander whose
 * name the avatar holds (resolved via commanderByName so no art URLs are duplicated).
 *
 * A commander picked as an avatar can later drop out of the top-500 daily dataset; when that
 * happens it's no longer in the live pool, so we fall back to the retired-commander vault
 * (lazily loaded) rather than showing an empty ring. Falls back to an empty ringed circle
 * only if neither knows the art.
 */
export default function AvatarImage({ avatar, size = 48, className, foil }: Props) {
  const [art, setArt] = useState<string | null>(
    () => commanderByName(avatar)?.artCrop ?? null,
  );

  useEffect(() => {
    const live = commanderByName(avatar)?.artCrop ?? null;
    if (live) {
      setArt(live);
      return;
    }
    // Not in the live pool — it may have dropped out; consult the vault.
    let cancelled = false;
    setArt(null);
    void ensureVaultLoaded().then(() => {
      if (!cancelled) setArt(commanderByName(avatar)?.artCrop ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [avatar]);

  return (
    <span
      className={`avatar-img${foil ? " avatar-foil" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={avatar || "avatar"}
    >
      {art && <img src={art} alt="" loading="lazy" />}
    </span>
  );
}
