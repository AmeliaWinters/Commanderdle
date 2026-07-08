/**
 * True on touch-first devices (phones/tablets) where the native share sheet is
 * genuinely useful. On desktop the same Web Share API exists in modern Edge/
 * Chrome but its share sheet defaults to email targets (e.g. Outlook), which
 * surprises players who just wanted their result on the clipboard - so we keep
 * desktop on the clipboard path.
 */
function prefersNativeShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function")
    return false;
  return (
    typeof matchMedia === "function" &&
    matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Share a result string: prefers the native Web Share API on touch devices
 * (mobile), and falls back to copying to the clipboard everywhere else.
 * Resolves to how the text left the app so callers can show the right
 * confirmation ("Shared!" vs "Copied!").
 */
export async function shareOrCopy(text: string): Promise<"shared" | "copied"> {
  // navigator.share must be user-gesture triggered; this is called from onClick.
  if (prefersNativeShare()) {
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
