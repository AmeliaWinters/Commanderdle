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
