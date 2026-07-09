function prefersNativeShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function")
    return false;
  return (
    typeof matchMedia === "function" &&
    matchMedia("(pointer: coarse)").matches
  );
}

export async function shareOrCopy(text: string): Promise<"shared" | "copied"> {
  if (prefersNativeShare()) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch {
    }
  }
  await navigator.clipboard?.writeText(text);
  return "copied";
}

export function shareOrigin(): string {
  return (
    import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || window.location.origin
  );
}
