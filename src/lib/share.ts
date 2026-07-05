/**
 * Share a result string: prefers the native Web Share API on devices that
 * support it (mobile), and falls back to copying to the clipboard everywhere
 * else. Resolves to how the text left the app so callers can show the right
 * confirmation ("Shared!" vs "Copied!").
 */
export async function shareOrCopy(text: string): Promise<"shared" | "copied"> {
  // navigator.share must be user-gesture triggered; this is called from onClick.
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch {
      // User cancelled or share failed - fall through to clipboard.
    }
  }
  await navigator.clipboard?.writeText(text);
  return "copied";
}

/** Canonical origin for share links (env-configured, falling back to the current origin). */
export function shareOrigin(): string {
  return (
    import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || window.location.origin
  );
}
