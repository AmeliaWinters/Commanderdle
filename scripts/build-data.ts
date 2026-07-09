import { writeFile, mkdir, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { hashString } from "../src/lib/hash";

const WEBP_QUALITY = 80;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "src", "data", "commanders.json");
const CORE_FILE = join(__dirname, "..", "src", "data", "commanders.core.json");
const SYNERGY_FILE = join(__dirname, "..", "src", "data", "synergy.json");
const META_FILE = join(__dirname, "..", "src", "data", "commanders.meta.json");
const ANSWERS_FILE = join(__dirname, "..", "src", "data", "answers.json");
const VAULT_FILE = join(
  __dirname,
  "..",
  "src",
  "data",
  "commanders.vault.json",
);
const VARIANTS_FILE = join(
  __dirname,
  "..",
  "src",
  "data",
  "commanders.variants.json",
);
const CARDS_DIR = join(__dirname, "..", "public", "cards");
const CACHE_FILE = join(__dirname, ".cache", "edhrec.json");

const TARGET_COUNT = 500;
const GRID_COUNT = 1000;
const EXT_FILE = join(__dirname, "..", "src", "data", "commanders.ext.json");
const MIN_VALID = Math.floor(TARGET_COUNT * 0.8);
const EDHREC_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const SCRYFALL_UA =
  "Commanderdle/0.1 (https://github.com/AmeliaWinters/Commanderdle)";
const EDHREC_BASE = "https://json.edhrec.com/pages/";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fileExists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  );

interface SynergyRef {
  name: string;
  synergy: number;
}

interface EdhrecCache {
  fetchedAt: string;
  commanders: EdhrecCardView[];
  synergy: Record<string, SynergyRef[]>;
}

function normalizeSynergyRefs(raw: unknown): SynergyRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) =>
    typeof r === "string" ? { name: r, synergy: 0 } : (r as SynergyRef),
  );
}

async function loadCache(): Promise<EdhrecCache | null> {
  if (!(await fileExists(CACHE_FILE))) return null;
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf-8")) as EdhrecCache;
  } catch (e) {
    console.warn(`Could not read EDHREC cache: ${(e as Error).message}`);
    return null;
  }
}

async function saveCache(cache: EdhrecCache): Promise<void> {
  await mkdir(dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface EdhrecCardView {
  name: string;
  sanitized?: string;
  rank?: number;
  num_decks?: number;
  inclusion?: number;
  synergy?: number;
  is_partner?: boolean;
  cards?: Array<{ name: string; url?: string }>;
}

function expandPartners(list: EdhrecCardView[]): EdhrecCardView[] {
  const out: EdhrecCardView[] = [];
  for (const v of list) {
    if (v.is_partner && v.cards?.length) {
      for (const member of v.cards) {
        out.push({
          name: member.name,
          sanitized: member.url,
          rank: v.rank,
          num_decks: v.num_decks,
          inclusion: v.inclusion,
        });
      }
    } else {
      out.push(v);
    }
  }
  return out;
}

const SYNERGY_COUNT = 6;

interface ScryfallCard {
  name: string;
  layout: string;
  color_identity: string[];
  type_line?: string;
  cmc?: number;
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity?: string;
  released_at?: string;
  set_name?: string;
  collector_number?: string;
  prices?: { usd?: string | null; usd_foil?: string | null };
  flavor_text?: string;
  illustration_id?: string;
  prints_search_uri?: string;
  card_faces?: Array<{
    type_line?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    flavor_text?: string;
    illustration_id?: string;
    image_uris?: { art_crop?: string; normal?: string };
  }>;
  image_uris?: { art_crop?: string; normal?: string };
}

interface ArtVariant {
  id: string;
  artCrop: string | null;
  normalImage: string | null;
  setName: string;
  number: string;
}

export interface SynergyCard {
  name: string;
  image: string | null;
  colorIdentity: string[];
  synergy: number;
}

export interface Commander {
  rank: number;
  name: string;
  numDecks: number;
  colorIdentity: string[];
  typeLine: string;
  manaValue: number;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  rarity: string;
  rarities: string[];
  year: number;
  setName: string;
  price: number | null;
  flavorText: string | null;
  artCrop: string | null;
  normalImage: string | null;
  synergyCards: SynergyCard[];
}

async function fetchEdhrecTop(count: number): Promise<EdhrecCardView[]> {
  const collected: EdhrecCardView[] = [];
  const seen = new Set<string>();
  let path: string | undefined = "commanders/year.json";
  let page = 0;
  while (path && collected.length < count && page < 14) {
    const res = await fetch(EDHREC_BASE + path, {
      headers: { "User-Agent": EDHREC_UA },
    });
    if (!res.ok) {
      console.warn(
        `EDHREC ${path} returned ${res.status}; stopping pagination.`,
      );
      break;
    }
    const json: any = await res.json();
    const list = json?.container?.json_dict?.cardlists?.[0] ?? json;
    const views: EdhrecCardView[] = list?.cardviews ?? [];
    if (views.length === 0) break;
    for (const v of views) {
      if (v?.name && !seen.has(v.name)) {
        seen.add(v.name);
        collected.push(v);
      }
    }
    page++;
    console.log(`EDHREC ${path}: +${views.length} (total ${collected.length})`);
    path = list?.more;
    await sleep(120);
  }
  return collected.slice(0, count);
}

async function fetchSynergyNames(sanitized: string): Promise<SynergyRef[]> {
  const res = await fetch(`${EDHREC_BASE}commanders/${sanitized}.json`, {
    headers: { "User-Agent": EDHREC_UA },
  });
  if (!res.ok) {
    console.warn(`EDHREC synergy ${sanitized} returned ${res.status}`);
    return [];
  }
  const json: any = await res.json();
  const lists: any[] = json?.container?.json_dict?.cardlists ?? [];
  let views: EdhrecCardView[] =
    lists.find((l) => /synerg/i.test(l?.header ?? ""))?.cardviews ?? [];
  if (views.length === 0) {
    views = lists
      .flatMap((l) => l?.cardviews ?? [])
      .filter((v: EdhrecCardView) => typeof v?.synergy === "number")
      .sort(
        (a: EdhrecCardView, b: EdhrecCardView) =>
          (b.synergy ?? 0) - (a.synergy ?? 0),
      );
  }
  return views
    .slice(0, SYNERGY_COUNT)
    .map((v) => ({ name: v.name, synergy: v.synergy ?? 0 }));
}

async function fetchScryfallBatch(
  names: string[],
): Promise<Map<string, ScryfallCard>> {
  const byName = new Map<string, ScryfallCard>();
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": SCRYFALL_UA,
      },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
    });
    if (!res.ok) {
      console.warn(`Scryfall batch ${i / 75} returned ${res.status}`);
      await sleep(150);
      continue;
    }
    const json: any = await res.json();
    for (const card of json.data as ScryfallCard[]) {
      byName.set(norm(card.name), card);
      for (const face of card.name.split(" // ")) byName.set(norm(face), card);
    }
    if (json.not_found?.length) {
      for (const nf of json.not_found) {
        const fuzzy = await fetchScryfallFuzzy(nf.name);
        if (fuzzy) {
          byName.set(norm(nf.name), fuzzy);
          console.log(`Scryfall fuzzy matched: ${nf.name} -> ${fuzzy.name}`);
        } else {
          console.warn(`Scryfall not found: ${nf.name}`);
        }
        await sleep(120);
      }
    }
    console.log(
      `Scryfall batch ${i / 75 + 1}: matched ${json.data.length}/${chunk.length}`,
    );
    await sleep(120);
  }
  return byName;
}

async function fetchScryfallFuzzy(name: string): Promise<ScryfallCard | null> {
  const query = name.split(" // ")[0];
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": SCRYFALL_UA } },
  );
  if (!res.ok) return null;
  return (await res.json()) as ScryfallCard;
}

function pickFace<T>(
  card: ScryfallCard,
  get: (f: NonNullable<ScryfallCard["card_faces"]>[number] | ScryfallCard) => T,
): T {
  const front = card.card_faces?.[0];
  const val = front ? get(front) : undefined;
  return (val ?? get(card)) as T;
}

function toCommander(
  rank: number,
  edh: EdhrecCardView,
  card: ScryfallCard | undefined,
  synergyCards: SynergyCard[],
): Commander | null {
  if (!card) return null;
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  const typeLine = card.type_line ?? pickFace(card, (f) => f.type_line) ?? "";
  const power = card.power ?? pickFace(card, (f) => (f as any).power) ?? null;
  const toughness =
    card.toughness ?? pickFace(card, (f) => (f as any).toughness) ?? null;
  const loyalty =
    card.loyalty ?? pickFace(card, (f) => (f as any).loyalty) ?? null;
  const flavor =
    card.flavor_text ?? pickFace(card, (f) => (f as any).flavor_text) ?? null;
  const year = card.released_at
    ? new Date(card.released_at).getUTCFullYear()
    : 0;
  const usd = card.prices?.usd ?? card.prices?.usd_foil ?? null;
  return {
    rank,
    name: card.name,
    numDecks: edh.num_decks ?? edh.inclusion ?? 0,
    colorIdentity: card.color_identity ?? [],
    typeLine,
    manaValue: card.cmc ?? 0,
    power: power ?? null,
    toughness: toughness ?? null,
    loyalty: loyalty ?? null,
    rarity: card.rarity ?? "unknown",
    rarities: [card.rarity ?? "unknown"],
    year,
    setName: card.set_name ?? "",
    price: usd != null ? Number(usd) : null,
    flavorText: flavor ?? null,
    artCrop: images?.art_crop ?? null,
    normalImage: images?.normal ?? null,
    synergyCards,
  };
}

function imageForName(
  name: string,
  cards: Map<string, ScryfallCard>,
): string | null {
  const card = cards.get(norm(name)) ?? cards.get(norm(name.split(" // ")[0]));
  if (!card) return null;
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  return images?.normal ?? null;
}

function localFileName(url: string): string {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  const size = parts[0] ?? "img";
  const base = parts[parts.length - 1] ?? "card.jpg";
  const name = `${size}_${base}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  return name.replace(/\.[a-z0-9]+$/i, "") + ".webp";
}

function illustrationId(card: ScryfallCard): string | null {
  return card.illustration_id ?? card.card_faces?.[0]?.illustration_id ?? null;
}

function variantId(illId: string): string {
  return illId.replace(/-/g, "").slice(0, 12);
}

async function fetchPrints(url: string): Promise<ScryfallCard[]> {
  const out: ScryfallCard[] = [];
  const u = new URL(url);
  u.searchParams.set("include_extras", "true");
  u.searchParams.set("include_variations", "true");
  u.searchParams.set("unique", "prints");
  let next: string | undefined = u.toString();
  let page = 0;
  while (next && page < 12) {
    const res = await fetch(next, { headers: { "User-Agent": SCRYFALL_UA } });
    if (!res.ok) {
      console.warn(`Scryfall prints ${next} returned ${res.status}`);
      break;
    }
    const json: any = await res.json();
    for (const c of (json.data ?? []) as ScryfallCard[]) out.push(c);
    next = json.has_more ? json.next_page : undefined;
    page++;
    await sleep(120);
  }
  return out;
}

async function buildVariants(
  commanders: Commander[],
  cards: Map<string, ScryfallCard>,
): Promise<Record<string, ArtVariant[]>> {
  const result: Record<string, ArtVariant[]> = {};
  let total = 0;
  for (let i = 0; i < commanders.length; i++) {
    const c = commanders[i];
    const card =
      cards.get(norm(c.name)) ?? cards.get(norm(c.name.split(" // ")[0]));
    if (!card?.prints_search_uri) continue;
    let prints: ScryfallCard[] = [];
    try {
      prints = await fetchPrints(card.prints_search_uri);
    } catch (e) {
      console.warn(
        `Prints fetch failed for ${c.name}: ${(e as Error).message}`,
      );
      continue;
    }
    const rarities = new Set(c.rarities);
    for (const p of prints) if (p.rarity) rarities.add(p.rarity);
    c.rarities = [...rarities];
    if (c.rank > TARGET_COUNT) continue;
    const seen = new Set<string>();
    const defaultIll = illustrationId(card);
    if (defaultIll) seen.add(variantId(defaultIll));
    const variants: ArtVariant[] = [];
    for (const p of prints) {
      const ill = illustrationId(p);
      if (!ill) continue;
      const id = variantId(ill);
      if (seen.has(id)) continue;
      seen.add(id);
      const imgs = p.image_uris ?? p.card_faces?.[0]?.image_uris;
      if (!imgs?.art_crop) continue;
      variants.push({
        id,
        artCrop: imgs.art_crop,
        normalImage: imgs.normal ?? null,
        setName: p.set_name ?? "",
        number: p.collector_number ?? "",
      });
    }
    if (variants.length) {
      result[c.name] = variants;
      total += variants.length;
    }
    if ((i + 1) % 50 === 0)
      console.log(`  variants: ${i + 1}/${commanders.length}`);
    await sleep(80);
  }
  console.log(
    `Found ${total} alternate-art variants across ${Object.keys(result).length} commanders.`,
  );
  return result;
}

async function localizeImages(
  commanders: Commander[],
  variants: Record<string, ArtVariant[]> = {},
): Promise<void> {
  await mkdir(CARDS_DIR, { recursive: true });

  const remoteUrls = new Set<string>();
  const addUrl = (u: string | null) => {
    if (u && /^https?:\/\//.test(u)) remoteUrls.add(u);
  };
  for (const c of commanders) {
    addUrl(c.artCrop);
    addUrl(c.normalImage);
    for (const s of c.synergyCards) addUrl(s.image);
  }
  for (const list of Object.values(variants)) {
    for (const v of list) {
      addUrl(v.artCrop);
      addUrl(v.normalImage);
    }
  }

  const resolved = new Map<string, string>();
  const urls = [...remoteUrls];
  let downloaded = 0;
  let reused = 0;
  let failed = 0;
  const CONCURRENCY = 8;

  const toWebp = (buf: Buffer) =>
    sharp(buf).webp({ quality: WEBP_QUALITY }).toBuffer();

  async function handle(url: string) {
    const file = localFileName(url);
    const dest = join(CARDS_DIR, file);
    const localPath = `cards/${file}`;
    if (await fileExists(dest)) {
      resolved.set(url, localPath);
      reused++;
      return;
    }
    const legacyJpg = dest.replace(/\.webp$/, ".jpg");
    if (await fileExists(legacyJpg)) {
      try {
        await writeFile(dest, await toWebp(await readFile(legacyJpg)));
        resolved.set(url, localPath);
        reused++;
        return;
      } catch (e) {
        console.warn(
          `Legacy JPG conversion failed (${(e as Error).message}): ${legacyJpg}`,
        );
      }
    }
    try {
      const res = await fetch(url, { headers: { "User-Agent": SCRYFALL_UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await toWebp(Buffer.from(await res.arrayBuffer()));
      await writeFile(dest, buf);
      resolved.set(url, localPath);
      downloaded++;
    } catch (e) {
      resolved.set(url, url);
      failed++;
      console.warn(`Image download failed (${(e as Error).message}): ${url}`);
    }
  }

  console.log(
    `Downloading ${urls.length} unique images into public/cards/ ...`,
  );
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    await Promise.all(urls.slice(i, i + CONCURRENCY).map(handle));
    await sleep(80);
  }
  console.log(
    `  images: ${downloaded} downloaded, ${reused} reused, ${failed} failed`,
  );

  const map = (u: string | null) => (u ? (resolved.get(u) ?? u) : null);
  for (const c of commanders) {
    c.artCrop = map(c.artCrop);
    c.normalImage = map(c.normalImage);
    for (const s of c.synergyCards) s.image = map(s.image);
  }
  for (const list of Object.values(variants)) {
    for (const v of list) {
      v.artCrop = map(v.artCrop);
      v.normalImage = map(v.normalImage);
    }
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!(await fileExists(path))) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch (e) {
    console.warn(`Could not read ${path}: ${(e as Error).message}`);
    return fallback;
  }
}

// Mode order/pool rules MUST mirror the client (src/lib/dailyAnswer.ts poolFor +
// src/lib/commanders.ts memoPool predicates) — the daily answer is
// pool[hashString(`${mode}:${date}`) % pool.length] over the same, same-ordered pool.
const DAILY_MODES = [
  "classic",
  "silhouette",
  "quote",
  "synergy",
  "zoom",
] as const;
type DailyMode = (typeof DAILY_MODES)[number];

function poolForMode(mode: DailyMode, commanders: Commander[]): Commander[] {
  switch (mode) {
    case "quote":
      return commanders.filter((c) => c.flavorText);
    case "synergy":
      return commanders.filter((c) => c.synergyCards.length >= 4);
    case "zoom":
      return commanders.filter((c) => c.normalImage ?? c.artCrop);
    default:
      return commanders;
  }
}

async function freezeDailyData(mainCommanders: Commander[]): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const answers = await readJson<
    Record<string, Partial<Record<DailyMode, string>>>
  >(ANSWERS_FILE, {});
  const todays = (answers[today] ??= {});
  let added = 0;
  for (const mode of DAILY_MODES) {
    if (todays[mode]) continue;
    const pool = poolForMode(mode, mainCommanders);
    if (pool.length === 0) continue;
    todays[mode] = pool[hashString(`${mode}:${today}`) % pool.length].name;
    added++;
  }
  await writeFile(
    ANSWERS_FILE,
    JSON.stringify(answers, null, 2) + "\n",
    "utf-8",
  );
  console.log(`Froze ${added} answer(s) for ${today} -> ${ANSWERS_FILE}`);

  const vault = await readJson<Record<string, Commander>>(VAULT_FILE, {});
  const before = Object.keys(vault).length;
  for (const c of mainCommanders) vault[c.name] = c;
  const retained = Object.keys(vault).length - mainCommanders.length;
  await writeFile(VAULT_FILE, JSON.stringify(vault) + "\n", "utf-8");
  console.log(
    `Vault: ${Object.keys(vault).length} commanders (${before} -> now; ${retained} retired kept) -> ${VAULT_FILE}`,
  );
}

async function main() {
  const cache = await loadCache();

  console.log("Fetching EDHREC top commanders...");
  let edhList: EdhrecCardView[] = [];
  try {
    edhList = await fetchEdhrecTop(GRID_COUNT);
  } catch (e) {
    console.warn(`EDHREC ranking fetch threw: ${(e as Error).message}`);
  }

  let usingFreshRanking = edhList.length >= MIN_VALID;
  if (!usingFreshRanking) {
    if (cache?.commanders?.length) {
      console.warn(
        `EDHREC returned ${edhList.length} (< ${MIN_VALID}); using cached ranking from ${cache.fetchedAt}.`,
      );
      edhList = cache.commanders;
    } else {
      throw new Error(
        `EDHREC returned ${edhList.length} commanders and no cache exists — aborting to avoid a bad build.`,
      );
    }
  }
  console.log(
    `Using ${edhList.length} commanders from ${usingFreshRanking ? "EDHREC (fresh)" : "cache"}.`,
  );

  const beforeExpand = edhList.length;
  edhList = expandPartners(edhList);
  if (edhList.length !== beforeExpand) {
    console.log(
      `Expanded partner pairs: ${beforeExpand} -> ${edhList.length} commander entries.`,
    );
  }

  console.log("Fetching synergy cards per commander from EDHREC...");
  const synergyNamesByCommander = new Map<string, SynergyRef[]>();
  for (let i = 0; i < edhList.length; i++) {
    const edh = edhList[i];
    if ((edh.rank ?? Infinity) > TARGET_COUNT) continue;
    const slug = edh.sanitized;
    if (!slug) continue;
    let names: SynergyRef[] = [];
    try {
      names = await fetchSynergyNames(slug);
    } catch (e) {
      console.warn(`EDHREC synergy ${slug} threw: ${(e as Error).message}`);
    }
    if (names.length === 0 && cache?.synergy?.[edh.name]?.length) {
      names = normalizeSynergyRefs(cache.synergy[edh.name]);
    }
    synergyNamesByCommander.set(edh.name, names);
    if ((i + 1) % 50 === 0)
      console.log(`  synergy: ${i + 1}/${edhList.length}`);
    await sleep(120);
  }

  const newCache: EdhrecCache = {
    fetchedAt: new Date().toISOString(),
    commanders: usingFreshRanking ? edhList : (cache?.commanders ?? edhList),
    synergy: Object.fromEntries(synergyNamesByCommander),
  };
  await saveCache(newCache);

  console.log("Enriching via Scryfall (commanders + synergy cards)...");
  const allNames = new Set<string>();
  for (const e of edhList) allNames.add(e.name);
  for (const refs of synergyNamesByCommander.values())
    for (const r of refs) allNames.add(r.name);
  const cards = await fetchScryfallBatch([...allNames]);

  let commanders: Commander[] = [];
  const seenNames = new Set<string>();
  for (const edh of edhList) {
    const card =
      cards.get(norm(edh.name)) ?? cards.get(norm(edh.name.split(" // ")[0]));
    const synergyCards: SynergyCard[] = (
      synergyNamesByCommander.get(edh.name) ?? []
    ).map((r) => {
      const sc =
        cards.get(norm(r.name)) ?? cards.get(norm(r.name.split(" // ")[0]));
      return {
        name: r.name,
        image: imageForName(r.name, cards),
        colorIdentity: sc?.color_identity ?? [],
        synergy: r.synergy,
      };
    });
    const c = toCommander(
      edh.rank ?? commanders.length + 1,
      edh,
      card,
      synergyCards,
    );
    if (!c) {
      console.warn(`No card for: ${edh.name}`);
      continue;
    }
    if (seenNames.has(c.name)) {
      console.warn(`Duplicate card dropped: ${c.name} (from "${edh.name}")`);
      continue;
    }
    seenNames.add(c.name);
    commanders.push(c);
  }
  commanders = commanders.filter((c) => c.rank <= GRID_COUNT);
  const mainCommanders = commanders.filter((c) => c.rank <= TARGET_COUNT);
  const extCommanders = commanders.filter((c) => c.rank > TARGET_COUNT);

  if (mainCommanders.length < MIN_VALID) {
    throw new Error(
      `Only built ${mainCommanders.length} commanders (< ${MIN_VALID}); refusing to overwrite commanders.json.`,
    );
  }

  console.log("Fetching printings (rarities + alternate art) from Scryfall...");
  let variants: Record<string, ArtVariant[]> = {};
  try {
    variants = await buildVariants(commanders, cards);
  } catch (e) {
    console.warn(`Variant build failed: ${(e as Error).message}`);
  }

  await localizeImages(commanders, variants);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(mainCommanders, null, 2), "utf-8");
  console.log(`Wrote ${mainCommanders.length} commanders to ${OUT_FILE}`);

  const ext = extCommanders.map(
    ({ synergyCards, flavorText, ...rest }) => rest,
  );
  await writeFile(EXT_FILE, JSON.stringify(ext), "utf-8");
  console.log(`Wrote ${ext.length} extended commanders to ${EXT_FILE}`);

  const core = mainCommanders.map(({ synergyCards, ...rest }) => ({
    ...rest,
    synergyCount: synergyCards.length,
  }));
  const synergy: Record<string, (typeof commanders)[number]["synergyCards"]> =
    {};
  for (const c of mainCommanders) synergy[c.name] = c.synergyCards;
  await writeFile(CORE_FILE, JSON.stringify(core), "utf-8");
  await writeFile(SYNERGY_FILE, JSON.stringify(synergy), "utf-8");
  await writeFile(VARIANTS_FILE, JSON.stringify(variants) + "\n", "utf-8");
  console.log(`Wrote variants -> ${VARIANTS_FILE}`);
  await writeFile(
    META_FILE,
    JSON.stringify({ generatedAt: newCache.fetchedAt }) + "\n",
    "utf-8",
  );
  console.log(`Wrote core -> ${CORE_FILE} and synergy -> ${SYNERGY_FILE}`);

  await freezeDailyData(mainCommanders);
  const withFlavor = mainCommanders.filter((c) => c.flavorText).length;
  const withArt = mainCommanders.filter((c) => c.artCrop).length;
  const withSynergy = mainCommanders.filter(
    (c) => c.synergyCards.length >= 4,
  ).length;
  console.log(`  with flavor text: ${withFlavor}`);
  console.log(`  with art: ${withArt}`);
  console.log(`  with >=4 synergy cards: ${withSynergy}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
