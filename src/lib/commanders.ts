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
import extUrl from "../data/commanders.ext.json?url";
import vaultUrl from "../data/commanders.vault.json?url";
import variantsUrl from "../data/commanders.variants.json?url";
import type { Commander, SynergyCard } from "../types/commander";
import { aliasIdentityKey, identityMatchesKey } from "./colorNames";

const BASE = import.meta.env.BASE_URL;
function resolveAsset(path: string | null): string | null {
  if (!path || /^https?:\/\//.test(path)) return path;
  return BASE + path.replace(/^\//, "");
}

type CoreCommander = Omit<Commander, "synergyCards">;

export const COMMANDERS: Commander[] = [];
export const COMMANDERS_BY_NAME = new Map<string, Commander>();

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

type ExtCommander = Omit<CoreCommander, "flavorText" | "synergyCount">;

export const EXT_COMMANDERS: Commander[] = [];

let extPromise: Promise<void> | null = null;
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
export function gridPool(): Commander[] {
  return (gridPoolCache ??= [...COMMANDERS, ...EXT_COMMANDERS]);
}

export const VAULT_BY_NAME = new Map<string, Commander>();

let vaultPromise: Promise<void> | null = null;
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

export function commanderByName(name: string): Commander | null {
  return COMMANDERS_BY_NAME.get(name) ?? VAULT_BY_NAME.get(name) ?? null;
}

export interface ArtVariant {
  id: string;
  artCrop: string | null;
  normalImage: string | null;
  setName: string;
  number: string;
}

export const VARIANTS_BY_NAME = new Map<string, ArtVariant[]>();

let variantsPromise: Promise<void> | null = null;
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

export function variantArt(name: string, id: string): ArtVariant | null {
  return VARIANTS_BY_NAME.get(name)?.find((v) => v.id === id) ?? null;
}

let synergyPromise: Promise<void> | null = null;
export let synergyLoaded = false;

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

export const quotePool = memoPool(() => COMMANDERS.filter((c) => c.flavorText));

export const synergyPool = memoPool(() =>
  COMMANDERS.filter((c) => c.synergyCount >= 4),
);

export const zoomPool = memoPool(() =>
  COMMANDERS.filter((c) => c.normalImage ?? c.artCrop),
);

function foldName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

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
