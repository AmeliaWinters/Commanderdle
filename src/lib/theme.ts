/* Theme preference. "system" follows the OS via prefers-color-scheme; the
   resolved theme ("light" | "dark") is reflected as data-theme on <html>,
   which styles/theme-light.css keys off. The inline pre-paint script in
   index.html applies the same logic before the bundle loads so there's no
   flash of the wrong theme; keep the two in sync if this changes. */

const KEY = "commandle:theme";

export type ThemePref = "system" | "light" | "dark";

const THEME_COLOR: Record<"light" | "dark", string> = {
  dark: "#0b0b0d",
  light: "#f4eee1",
};

const listeners = new Set<(pref: ThemePref) => void>();

const media =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: light)")
    : null;

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref === "system") return media?.matches ? "light" : "dark";
  return pref;
}

function apply(pref: ThemePref) {
  const theme = resolve(pref);
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (meta) meta.content = THEME_COLOR[theme];
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable */
  }
  apply(pref);
  listeners.forEach((fn) => fn(pref));
}

/** System → Light → Dark → System, returning the new preference. */
export function cycleThemePref(): ThemePref {
  const order: ThemePref[] = ["system", "light", "dark"];
  const next = order[(order.indexOf(getThemePref()) + 1) % order.length];
  setThemePref(next);
  return next;
}

export function onThemeChange(fn: (pref: ThemePref) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Apply the stored preference and track OS changes while in "system". */
export function initTheme() {
  apply(getThemePref());
  media?.addEventListener("change", () => {
    if (getThemePref() === "system") apply("system");
  });
}
