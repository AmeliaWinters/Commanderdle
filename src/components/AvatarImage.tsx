import { useEffect, useState } from "react";
import {
  commanderByName,
  ensureVaultLoaded,
  ensureVariantsLoaded,
  variantArt,
} from "../lib/commanders";
import { splitAvatar } from "../lib/avatars";

interface Props {
  avatar: string;
  size?: number;
  className?: string;
  foil?: boolean;
}

/**
 * Resolves an avatar (a commander name, optionally suffixed `#<art id>` for a Mythic+
 * alternate printing) to its art crop.
 *
 * A commander picked as an avatar can later drop out of the top-500 daily dataset; when that
 * happens it's no longer in the live pool, so we fall back to the retired-commander vault
 * (lazily loaded) rather than showing an empty ring. An alternate-art suffix resolves against
 * the lazily-loaded variants map. Falls back to an empty ringed circle only if nothing knows
 * the art.
 */
export default function AvatarImage({ avatar, size = 48, className, foil }: Props) {
  const { name, variant } = splitAvatar(avatar);

  const [art, setArt] = useState<string | null>(() =>
    variant
      ? variantArt(name, variant)?.artCrop ?? null
      : commanderByName(name)?.artCrop ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    if (variant) {
      // Alternate printing: resolve against the (lazily-loaded) variants map, falling back
      // to the commander's default art if that specific printing isn't known.
      const known = variantArt(name, variant)?.artCrop ?? null;
      if (known) {
        setArt(known);
        return;
      }
      setArt(commanderByName(name)?.artCrop ?? null);
      void ensureVariantsLoaded().then(() => {
        if (!cancelled) {
          setArt(
            variantArt(name, variant)?.artCrop ??
              commanderByName(name)?.artCrop ??
              null,
          );
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const live = commanderByName(name)?.artCrop ?? null;
    if (live) {
      setArt(live);
      return;
    }
    // Not in the live pool — it may have dropped out; consult the vault.
    setArt(null);
    void ensureVaultLoaded().then(() => {
      if (!cancelled) setArt(commanderByName(name)?.artCrop ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [name, variant]);

  return (
    <span
      className={`avatar-img${foil ? " avatar-foil" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={name || "avatar"}
    >
      {art && <img src={art} alt="" loading="lazy" />}
    </span>
  );
}
