// The "core" dataset (every field except the heavy `synergyCards` arrays, which are split
// into ../data/synergy.json and hydrated on demand for Synergy mode only).
//
// It is *not* imported as a JS module: inlining the ~239KB JSON into the main bundle turned
// it into a giant object literal the engine had to evaluate on the main thread before React
// could boot, pushing LCP to ~6s on throttled mobile. The `?url` import emits it as a
// separate, content-hashed static asset (auto cache-busted when the daily refresh changes
// it); loadCommanders() fetches and JSON.parses it - ~2x faster than evaluating a literal,
// and in parallel with the JS download. See main.tsx, which gates React's mount on the load.
import coreUrl from "../data/commanders.core.json?url";
// Ranks 501-1000, used only by Grid mode. Same lazy `?url` treatment as the core file so
// the deeper pool costs nothing on the initial page load.
import extUrl from "../data/commanders.ext.json?url";
// Append-only "vault" of every commander that has *ever* been in the top-500 core, with full
// data (art, flavor, synergy) frozen from when it was last live. It exists so anything that
// can outlive a commander's stay in the top-500 — a past archive answer, or a player's chosen
// avatar — still resolves after that commander drops out of the daily dataset. Lazily loaded
// (never in the initial bundle); only the archive and avatar-fallback paths ask for it.
import vaultUrl from "../data/commanders.vault.json?url";
// Meaningfully-different alternate-art printings per commander (deduped by Scryfall
// illustration id, so foils/reprints of the same art are excluded). Keyed by commander name.
// Only the Mythic+/The Creator avatar gallery reads it, so it's lazily loaded, never in the bundle.
import variantsUrl from "../data/commanders.variants.json?url";
import type { Commander, SynergyCard } from "../types/commander";
import { aliasIdentityKey, identityMatchesKey } from "./colorNames";

// Images are self-hosted under public/cards/ as "cards/<file>" paths. Resolve them against
// the deploy base (Vite's BASE_URL) so they work whether the app is served from the root or
// a subpath. Legacy absolute http(s) URLs (e.g. a download that failed at build time and
// fell back to Scryfall's CDN) are left untouched.
const BASE = import.meta.env.BASE_URL;
function resolveAsset(path: string | null): string | null {
  if (!path || /^https?:\/\//.test(path)) return path;
  return BASE + path.replace(/^\//, "");
}

// The core file omits `synergyCards`; each commander starts with an empty array that
// ensureSynergyLoaded() fills in place once the split payload arrives.
type CoreCommander = Omit<Commander, "synergyCards">;

// Populated by hydrateCommanders() (called by loadCommanders() in the app, and synchronously
// from the test setup). Both stay stable references so modules that captured them at import
// time see the data once it lands. Empty until hydrated - the app keeps the HTML skeleton on
// screen until then (see main.tsx), so nothing reads these before they're filled.
export const COMMANDERS: Commander[] = [];
export const COMMANDERS_BY_NAME = new Map<string, Commander>();

/** Populate COMMANDERS + COMMANDERS_BY_NAME from a parsed core payload. Idempotent. */
export function hydrateCommanders(core: CoreCommander[]): void {
  COMMANDERS.length = 0;
  COMMANDERS_BY_NAME.clear();
  for (const c of core) {
    const commander: Commander = {
      ...c,
      artCrop: resolveAsset(c.artCrop),
      normalImage: resolveAsset(c.normalImage),
      synergyCards: [],
    };
    COMMANDERS.push(commander);
    COMMANDERS_BY_NAME.set(commander.name, commander);
  }
  resetPools();
}

let corePromise: Promise<void> | null = null;
/**
 * Fetch + parse the core dataset and hydrate COMMANDERS. Idempotent (fires at most once).
 * One retry on failure - a hard failure leaves the arrays empty and the caller keeps the
 * loading skeleton up rather than rendering a broken game.
 */
export function loadCommanders(): Promise<void> {
  if (!corePromise) {
    const fetchCore = () =>
      fetch(coreUrl).then((r) => r.json() as Promise<CoreCommander[]>);
    corePromise = fetchCore()
      .catch(() => fetchCore())
      .then(hydrateCommanders);
  }
  return corePromise;
}

// The extended tail (ranks 501-1000) that build-data.ts splits into commanders.ext.json.
// It omits flavor text and synergy - Grid mode is the only consumer and needs neither.
type ExtCommander = Omit<CoreCommander, "flavorText" | "synergyCount">;

/** Ranks 501-1000, hydrated by ensureExtendedLoaded(). Empty until Grid mode asks. */
export const EXT_COMMANDERS: Commander[] = [];

let extPromise: Promise<void> | null = null;
/**
 * Lazily fetch the extended commander tail for Grid mode. Best-effort: a hard failure
 * (after one retry) resolves anyway with EXT_COMMANDERS left empty, so the grid still
 * plays over the top-500 core pool offline.
 */
export function ensureExtendedLoaded(): Promise<void> {
  if (!extPromise) {
    const fetchExt = () =>
      fetch(extUrl).then((r) => r.json() as Promise<ExtCommander[]>);
    extPromise = fetchExt()
      .catch(() => fetchExt())
      .then((ext) => {
        EXT_COMMANDERS.length = 0;
        for (const c of ext) {
          EXT_COMMANDERS.push({
            ...c,
            flavorText: null,
            synergyCount: 0,
            artCrop: resolveAsset(c.artCrop),
            normalImage: resolveAsset(c.normalImage),
            synergyCards: [],
          });
        }
        gridPoolCache = null;
      })
      .catch(() => undefined);
  }
  return extPromise;
}

let gridPoolCache: Commander[] | null = null;
/** Grid mode's answer pool: the top-500 core plus the extended tail once it has loaded. */
export function gridPool(): Commander[] {
  return (gridPoolCache ??= [...COMMANDERS, ...EXT_COMMANDERS]);
}

// The vault (see vaultUrl above). Keyed by commander name; entries carry full data including
// synergyCards, so a dropped-out commander is still fully playable as a past archive answer.
export const VAULT_BY_NAME = new Map<string, Commander>();

let vaultPromise: Promise<void> | null = null;
/**
 * Lazily fetch + hydrate the retired-commander vault. Best-effort: a hard failure (after one
 * retry) resolves anyway with VAULT_BY_NAME left as-is, so callers fall back to the fallback
 * silhouette / a live-pool answer rather than breaking.
 */
export function ensureVaultLoaded(): Promise<void> {
  if (!vaultPromise) {
    const fetchVault = () =>
      fetch(vaultUrl).then(
        (r) => r.json() as Promise<Record<string, Commander>>,
      );
    vaultPromise = fetchVault()
      .catch(() => fetchVault())
      .then((vault) => {
        for (const raw of Object.values(vault)) {
          VAULT_BY_NAME.set(raw.name, {
            ...raw,
            artCrop: resolveAsset(raw.artCrop),
            normalImage: resolveAsset(raw.normalImage),
            synergyCount: raw.synergyCards?.length ?? raw.synergyCount ?? 0,
            synergyCards: (raw.synergyCards ?? []).map((s) => ({
              ...s,
              image: resolveAsset(s.image),
            })),
          });
        }
      })
      .catch(() => undefined);
  }
  return vaultPromise;
}

/**
 * Resolve a commander by name, preferring the live top-500 dataset and falling back to the
 * vault of retired commanders. Returns null if neither has it (and, for the vault, only once
 * ensureVaultLoaded() has resolved). Used by avatar rendering and archive answer resolution.
 */
export function commanderByName(name: string): Commander | null {
  return COMMANDERS_BY_NAME.get(name) ?? VAULT_BY_NAME.get(name) ?? null;
}

/** One meaningfully-different alternate printing's art for a commander (see variantsUrl). */
export interface ArtVariant {
  /** Short slice of the Scryfall illustration id — the avatar suffix after `#`. */
  id: string;
  artCrop: string | null;
  normalImage: string | null;
  /** Set name (kept for context/tooltips). */
  setName: string;
  /** Collector number of this printing, shown as the label (e.g. "307") so players can
   * tell the printings apart. */
  number: string;
}

/** commander name -> its alternate-art printings. Empty until ensureVariantsLoaded() resolves. */
export const VARIANTS_BY_NAME = new Map<string, ArtVariant[]>();

let variantsPromise: Promise<void> | null = null;
/**
 * Lazily fetch + hydrate the alternate-art variants map. Best-effort: a hard failure (after
 * one retry) resolves with VARIANTS_BY_NAME left as-is, so the gallery simply shows no alt
 * arts rather than breaking. Only the Mythic+/The Creator avatar gallery and variant avatar
 * rendering ask for it.
 */
export function ensureVariantsLoaded(): Promise<void> {
  if (!variantsPromise) {
    const fetchVariants = () =>
      fetch(variantsUrl).then(
        (r) => r.json() as Promise<Record<string, ArtVariant[]>>,
      );
    variantsPromise = fetchVariants()
      .catch(() => fetchVariants())
      .then((map) => {
        for (const [name, variants] of Object.entries(map)) {
          VARIANTS_BY_NAME.set(
            name,
            variants.map((v) => ({
              ...v,
              artCrop: resolveAsset(v.artCrop),
              normalImage: resolveAsset(v.normalImage),
            })),
          );
        }
      })
      .catch(() => undefined);
  }
  return variantsPromise;
}

/** Resolve one alternate-art printing's crop by commander name + variant id (see splitAvatar). */
export function variantArt(name: string, id: string): ArtVariant | null {
  return VARIANTS_BY_NAME.get(name)?.find((v) => v.id === id) ?? null;
}

let synergyPromise: Promise<void> | null = null;
/** True once the split synergy payload has been hydrated onto COMMANDERS. */
export let synergyLoaded = false;

/**
 * Lazily load ../data/synergy.json (the largest slice of the dataset - kept out of the
 * initial bundle) and fill each commander's `synergyCards` in place. Idempotent: the
 * import fires at most once. Only Synergy mode needs this.
 */
export function ensureSynergyLoaded(): Promise<void> {
  if (!synergyPromise) {
    synergyPromise = import("../data/synergy.json").then((mod) => {
      const map = mod.default as Record<string, SynergyCard[]>;
      for (const c of COMMANDERS) {
        const raw = map[c.name];
        if (raw)
          c.synergyCards = raw.map((s) => ({
            ...s,
            image: resolveAsset(s.image),
          }));
      }
      synergyLoaded = true;
    });
  }
  return synergyPromise;
}

// The three non-Classic answer pools are each a full scan over COMMANDERS. Classic (the
// initial view) never needs them, so they're computed lazily on first access rather than
// at module load - keeping that work out of the first-render task that TBT measures. Each
// result is cached, so repeat callers get a stable array identity. The caches are cleared by
// hydrateCommanders() so a pool queried before the data lands can't pin an empty result.
const poolResetters: Array<() => void> = [];
function resetPools(): void {
  gridPoolCache = null;
  for (const reset of poolResetters) reset();
}
function memoPool(build: () => Commander[]): () => Commander[] {
  let cached: Commander[] | null = null;
  poolResetters.push(() => {
    cached = null;
  });
  return () => (cached ??= build());
}

/** Commanders eligible as Quote-mode answers (must have flavor text to show). */
export const quotePool = memoPool(() => COMMANDERS.filter((c) => c.flavorText));

/** Commanders eligible as Synergy-mode answers (need enough synergy cards to reveal).
 * Uses the core `synergyCount` so the pool - and thus the deterministic daily answer -
 * is stable whether or not the synergy arrays have been hydrated yet. */
export const synergyPool = memoPool(() =>
  COMMANDERS.filter((c) => c.synergyCount >= 4),
);

/** Commanders eligible as Zoom-mode answers (need an image to zoom into). */
export const zoomPool = memoPool(() =>
  COMMANDERS.filter((c) => c.normalImage ?? c.artCrop),
);

/**
 * Fold a name into a match key: lowercase, strip diacritics (Y'shtola -> yshtola),
 * and drop punctuation/whitespace so queries like "yshtola" or "jacethemind"
 * still match "Y'shtola" and "Jace, the Mind Sculptor".
 */
function foldName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Punctuation/diacritic-insensitive substring search over commander names, ranked by EDHREC
 * popularity. Name matches always come first; if the query is a color-identity nickname
 * ("Rakdos", "Temur", "Mono-White", "WUBRG") any leftover slots are filled with commanders
 * of exactly that color identity — so an MTG player can search by guild/shard/wedge too.
 */
export function searchCommanders(
  query: string,
  limit = 8,
  pool: readonly Commander[] = COMMANDERS,
): Commander[] {
  const q = foldName(query);
  if (!q) return [];
  const starts: Commander[] = [];
  const contains: Commander[] = [];
  for (const c of pool) {
    const name = foldName(c.name);
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  const byName = [...starts, ...contains].slice(0, limit);

  const identityKey = aliasIdentityKey(query);
  if (identityKey && byName.length < limit) {
    const seen = new Set(byName.map((c) => c.name));
    for (const c of pool) {
      if (byName.length >= limit) break;
      if (seen.has(c.name)) continue;
      if (identityMatchesKey(c.colorIdentity, identityKey)) byName.push(c);
    }
  }
  return byName;
}
