/**
 * build-data.ts
 *
 * Generates src/data/commanders.json — the static dataset the app ships with — and
 * downloads every card image into public/cards/ so the app serves images from its own
 * host rather than hotlinking Scryfall's CDN (which Scryfall's guidelines discourage,
 * and whose URLs rotate over time).
 *
 * Pipeline:
 *   1. Pull the EDHREC "top commanders (past 2 years)" ranked list (paginated, 100/page),
 *      plus each commander's high-synergy cards. EDHREC drives popularity/ranking, which
 *      changes over time, so this is re-run regularly (at least daily).
 *   2. Enrich each via Scryfall's /cards/collection batch endpoint (75 ids/request) to get
 *      color identity, type, mana value, power/toughness, rarity, release year, flavor text,
 *      and image URIs.
 *   3. Download all referenced images into public/cards/ (deduped, skipping ones already
 *      on disk) and rewrite the dataset to point at local "cards/<file>" paths.
 *   4. Write the merged, ranked dataset to src/data/commanders.json.
 *
 * Resilience: EDHREC has no official API — json.edhrec.com is undocumented and could be
 * discontinued or start refusing our requests. So every successful EDHREC fetch is cached
 * to scripts/.cache/edhrec.json (committed to the repo). On a run where EDHREC fails or
 * returns too little data, we fall back to that last-good cache and keep building rather
 * than wiping a good dataset. We only overwrite cached data when EDHREC returns a proper,
 * non-empty response. Likewise we refuse to overwrite commanders.json with a degenerate
 * (too-small) result.
 *
 * Run with: npm run build:data
 *
 * Both APIs are free and require no key. Scryfall asks for a descriptive User-Agent and a
 * ~50-100ms delay between requests, which we honor.
 */
import { writeFile, mkdir, readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

// WebP quality for the downloaded card images. 80 is visually ~indistinguishable from the
// source JPGs while cutting file size by roughly half, which directly lowers bandwidth/CDN cost.
const WEBP_QUALITY = 80

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'commanders.json')
// Vite serves public/ at the deploy root; images land here and ship as static assets.
const CARDS_DIR = join(__dirname, '..', 'public', 'cards')
// Last-good EDHREC payload, committed so the build survives json.edhrec.com going away.
const CACHE_FILE = join(__dirname, '.cache', 'edhrec.json')

const TARGET_COUNT = 500
// A fresh EDHREC ranking shorter than this is treated as a failed/degraded fetch, and we
// fall back to the cached list instead of trusting it.
const MIN_VALID = Math.floor(TARGET_COUNT * 0.8)
// EDHREC's JSON host sits behind Cloudflare and 403s non-browser User-Agents.
const EDHREC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
// Scryfall asks for a descriptive User-Agent identifying the app.
const SCRYFALL_UA = 'Commanderdle/0.1 (https://github.com/AmeliaWinters/Commanderdle)'
const EDHREC_BASE = 'https://json.edhrec.com/pages/'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const fileExists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  )

/** Shape of the committed last-good EDHREC cache (scripts/.cache/edhrec.json). */
interface EdhrecCache {
  fetchedAt: string
  commanders: EdhrecCardView[]
  synergy: Record<string, string[]>
}

async function loadCache(): Promise<EdhrecCache | null> {
  if (!(await fileExists(CACHE_FILE))) return null
  try {
    return JSON.parse(await readFile(CACHE_FILE, 'utf-8')) as EdhrecCache
  } catch (e) {
    console.warn(`Could not read EDHREC cache: ${(e as Error).message}`)
    return null
  }
}

async function saveCache(cache: EdhrecCache): Promise<void> {
  await mkdir(dirname(CACHE_FILE), { recursive: true })
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8')
}

/** Normalize a card name for matching across EDHREC/Scryfall (diacritics, punctuation, case). */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

interface EdhrecCardView {
  name: string
  sanitized?: string
  rank?: number
  num_decks?: number
  inclusion?: number
  synergy?: number
  // Partner-pair entries carry these: `is_partner` flags the pair, `cards` lists the two
  // individual commanders ({ name, url=slug }) that make it up. (Double-faced/melded cards
  // also use an "A // B" name but are a single Scryfall card and carry none of these.)
  is_partner?: boolean
  cards?: Array<{ name: string; url?: string }>
}

/**
 * Expand partner-pair entries into one entry per individual commander.
 *
 * EDHREC lists a legal partner pairing (e.g. "Rograkh, Son of Rohgahh // Silas Renn,
 * Seeker Adept") as a single ranked entry, but the two partners are distinct cards that
 * should each be guessable. We split each `is_partner` entry into its two members, both
 * inheriting the pair's rank and deck count, and point each at its own EDHREC page slug so
 * synergy/enrichment resolve per individual commander. Non-partner entries (including
 * single-card double-faced commanders) pass through untouched.
 *
 * Idempotent: a list with no partner entries (e.g. an already-expanded cache) is returned
 * unchanged.
 */
function expandPartners(list: EdhrecCardView[]): EdhrecCardView[] {
  const out: EdhrecCardView[] = []
  for (const v of list) {
    if (v.is_partner && v.cards?.length) {
      for (const member of v.cards) {
        out.push({
          name: member.name,
          sanitized: member.url,
          rank: v.rank,
          num_decks: v.num_decks,
          inclusion: v.inclusion,
        })
      }
    } else {
      out.push(v)
    }
  }
  return out
}

/** How many top-synergy cards to keep per commander (drives the Synergy game mode). */
const SYNERGY_COUNT = 6

interface ScryfallCard {
  name: string
  layout: string
  color_identity: string[]
  type_line?: string
  cmc?: number
  power?: string
  toughness?: string
  loyalty?: string
  rarity?: string
  released_at?: string
  set_name?: string
  flavor_text?: string
  card_faces?: Array<{
    type_line?: string
    power?: string
    toughness?: string
    loyalty?: string
    flavor_text?: string
    image_uris?: { art_crop?: string; normal?: string }
  }>
  image_uris?: { art_crop?: string; normal?: string }
}

export interface SynergyCard {
  name: string
  image: string | null
  colorIdentity: string[]
}

export interface Commander {
  rank: number
  name: string
  numDecks: number
  colorIdentity: string[]
  typeLine: string
  manaValue: number
  power: string | null
  toughness: string | null
  loyalty: string | null
  rarity: string
  year: number
  setName: string
  flavorText: string | null
  artCrop: string | null
  normalImage: string | null
  synergyCards: SynergyCard[]
}

async function fetchEdhrecTop(count: number): Promise<EdhrecCardView[]> {
  const collected: EdhrecCardView[] = []
  const seen = new Set<string>()
  // Start at the "Past 2 Years" top-commanders list; each page's cardlist carries a `more`
  // field pointing at the next 100-entry page (e.g. commanders/year-past2years-1.json).
  let path: string | undefined = 'commanders/year.json'
  let page = 0
  while (path && collected.length < count && page < 14) {
    const res = await fetch(EDHREC_BASE + path, { headers: { 'User-Agent': EDHREC_UA } })
    if (!res.ok) {
      console.warn(`EDHREC ${path} returned ${res.status}; stopping pagination.`)
      break
    }
    const json: any = await res.json()
    // First page nests the list under container.json_dict.cardlists[0]; subsequent paginated
    // pages put `cardviews` and `more` at the top level.
    const list = json?.container?.json_dict?.cardlists?.[0] ?? json
    const views: EdhrecCardView[] = list?.cardviews ?? []
    if (views.length === 0) break
    for (const v of views) {
      if (v?.name && !seen.has(v.name)) {
        seen.add(v.name)
        collected.push(v)
      }
    }
    page++
    console.log(`EDHREC ${path}: +${views.length} (total ${collected.length})`)
    path = list?.more
    await sleep(120)
  }
  return collected.slice(0, count)
}

/**
 * Fetch a commander's EDHREC page and return the top synergy-card names (most
 * synergistic first). Reads the "High Synergy Cards" list, falling back to the
 * highest-`synergy` cardviews across the page if that list is absent.
 */
async function fetchSynergyNames(sanitized: string): Promise<string[]> {
  const res = await fetch(`${EDHREC_BASE}commanders/${sanitized}.json`, {
    headers: { 'User-Agent': EDHREC_UA },
  })
  if (!res.ok) {
    console.warn(`EDHREC synergy ${sanitized} returned ${res.status}`)
    return []
  }
  const json: any = await res.json()
  const lists: any[] = json?.container?.json_dict?.cardlists ?? []
  let views: EdhrecCardView[] =
    lists.find((l) => /synerg/i.test(l?.header ?? ''))?.cardviews ?? []
  if (views.length === 0) {
    // Fall back: flatten every list and rank by synergy score.
    views = lists
      .flatMap((l) => l?.cardviews ?? [])
      .filter((v: EdhrecCardView) => typeof v?.synergy === 'number')
      .sort((a: EdhrecCardView, b: EdhrecCardView) => (b.synergy ?? 0) - (a.synergy ?? 0))
  }
  return views.slice(0, SYNERGY_COUNT).map((v) => v.name)
}

async function fetchScryfallBatch(names: string[]): Promise<Map<string, ScryfallCard>> {
  const byName = new Map<string, ScryfallCard>()
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75)
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': SCRYFALL_UA },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
    })
    if (!res.ok) {
      console.warn(`Scryfall batch ${i / 75} returned ${res.status}`)
      await sleep(150)
      continue
    }
    const json: any = await res.json()
    for (const card of json.data as ScryfallCard[]) {
      byName.set(norm(card.name), card)
      // EDHREC references double-faced commanders by their front-face name only, while Scryfall
      // returns the full "Front // Back" name — index the front (and back) face too.
      for (const face of card.name.split(' // ')) byName.set(norm(face), card)
    }
    if (json.not_found?.length) {
      for (const nf of json.not_found) {
        const fuzzy = await fetchScryfallFuzzy(nf.name)
        if (fuzzy) {
          byName.set(norm(nf.name), fuzzy)
          console.log(`Scryfall fuzzy matched: ${nf.name} -> ${fuzzy.name}`)
        } else {
          console.warn(`Scryfall not found: ${nf.name}`)
        }
        await sleep(120)
      }
    }
    console.log(`Scryfall batch ${i / 75 + 1}: matched ${json.data.length}/${chunk.length}`)
    await sleep(120)
  }
  return byName
}

async function fetchScryfallFuzzy(name: string): Promise<ScryfallCard | null> {
  // Partner/double-faced names like "A // B" sometimes miss exact match; try the front half fuzzy.
  const query = name.split(' // ')[0]
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`,
    { headers: { 'User-Agent': SCRYFALL_UA } },
  )
  if (!res.ok) return null
  return (await res.json()) as ScryfallCard
}

function pickFace<T>(card: ScryfallCard, get: (f: NonNullable<ScryfallCard['card_faces']>[number] | ScryfallCard) => T): T {
  const front = card.card_faces?.[0]
  const val = front ? get(front) : undefined
  return (val ?? get(card)) as T
}

function toCommander(
  rank: number,
  edh: EdhrecCardView,
  card: ScryfallCard | undefined,
  synergyCards: SynergyCard[],
): Commander | null {
  if (!card) return null
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris
  const typeLine = card.type_line ?? pickFace(card, (f) => f.type_line) ?? ''
  const power = card.power ?? pickFace(card, (f) => (f as any).power) ?? null
  const toughness = card.toughness ?? pickFace(card, (f) => (f as any).toughness) ?? null
  const loyalty = card.loyalty ?? pickFace(card, (f) => (f as any).loyalty) ?? null
  const flavor = card.flavor_text ?? pickFace(card, (f) => (f as any).flavor_text) ?? null
  const year = card.released_at ? new Date(card.released_at).getUTCFullYear() : 0
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
    rarity: card.rarity ?? 'unknown',
    year,
    setName: card.set_name ?? '',
    flavorText: flavor ?? null,
    artCrop: images?.art_crop ?? null,
    normalImage: images?.normal ?? null,
    synergyCards,
  }
}

/** Resolve a Scryfall normal image for a card name (front face for DFCs). */
function imageForName(name: string, cards: Map<string, ScryfallCard>): string | null {
  const card = cards.get(norm(name)) ?? cards.get(norm(name.split(' // ')[0]))
  if (!card) return null
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris
  return images?.normal ?? null
}

/**
 * Derive a stable, collision-free local filename from a Scryfall image URL.
 * e.g. https://cards.scryfall.io/normal/front/1/0/<uuid>.jpg?123 -> "normal_<uuid>.webp"
 * The size folder (normal/art_crop) and the per-art uuid together are unique, and dropping
 * the ?<timestamp> query means re-runs reuse the same file instead of re-downloading.
 * Images are stored as WebP (see WEBP_QUALITY), so the extension is forced to .webp.
 */
function localFileName(url: string): string {
  const { pathname } = new URL(url)
  const parts = pathname.split('/').filter(Boolean)
  const size = parts[0] ?? 'img'
  const base = parts[parts.length - 1] ?? 'card.jpg'
  const name = `${size}_${base}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  return name.replace(/\.[a-z0-9]+$/i, '') + '.webp'
}

/**
 * Download every Scryfall image referenced by the dataset into public/cards/ and rewrite
 * the commanders (in place) to point at local "cards/<file>" paths.
 *
 * - Deduplicates: synergy art repeats across commanders, so each URL downloads once.
 * - Skips files already on disk, making re-runs cheap and surviving an offline Scryfall
 *   CDN (a previously-downloaded image is reused).
 * - On a download failure with no existing file, the original remote URL is kept so the
 *   app still renders something rather than a broken image.
 */
async function localizeImages(commanders: Commander[]): Promise<void> {
  await mkdir(CARDS_DIR, { recursive: true })

  // Collect every distinct remote URL the dataset references.
  const remoteUrls = new Set<string>()
  const addUrl = (u: string | null) => {
    if (u && /^https?:\/\//.test(u)) remoteUrls.add(u)
  }
  for (const c of commanders) {
    addUrl(c.artCrop)
    addUrl(c.normalImage)
    for (const s of c.synergyCards) addUrl(s.image)
  }

  // remote URL -> local "cards/<file>" path (or the remote URL itself if download failed).
  const resolved = new Map<string, string>()
  const urls = [...remoteUrls]
  let downloaded = 0
  let reused = 0
  let failed = 0
  const CONCURRENCY = 8

  const toWebp = (buf: Buffer) => sharp(buf).webp({ quality: WEBP_QUALITY }).toBuffer()

  async function handle(url: string) {
    const file = localFileName(url)
    const dest = join(CARDS_DIR, file)
    const localPath = `cards/${file}`
    if (await fileExists(dest)) {
      resolved.set(url, localPath)
      reused++
      return
    }
    // Migrate any pre-WebP download: convert the existing .jpg in place rather than
    // re-fetching it from Scryfall.
    const legacyJpg = dest.replace(/\.webp$/, '.jpg')
    if (await fileExists(legacyJpg)) {
      try {
        await writeFile(dest, await toWebp(await readFile(legacyJpg)))
        resolved.set(url, localPath)
        reused++
        return
      } catch (e) {
        console.warn(`Legacy JPG conversion failed (${(e as Error).message}): ${legacyJpg}`)
      }
    }
    try {
      const res = await fetch(url, { headers: { 'User-Agent': SCRYFALL_UA } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = await toWebp(Buffer.from(await res.arrayBuffer()))
      await writeFile(dest, buf)
      resolved.set(url, localPath)
      downloaded++
    } catch (e) {
      // Keep the remote URL as a last-resort fallback so the image still loads.
      resolved.set(url, url)
      failed++
      console.warn(`Image download failed (${(e as Error).message}): ${url}`)
    }
  }

  console.log(`Downloading ${urls.length} unique images into public/cards/ ...`)
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    await Promise.all(urls.slice(i, i + CONCURRENCY).map(handle))
    // Stay comfortably under Scryfall's 10 req/s ceiling between batches.
    await sleep(80)
  }
  console.log(`  images: ${downloaded} downloaded, ${reused} reused, ${failed} failed`)

  // Rewrite the dataset to local paths.
  const map = (u: string | null) => (u ? resolved.get(u) ?? u : null)
  for (const c of commanders) {
    c.artCrop = map(c.artCrop)
    c.normalImage = map(c.normalImage)
    for (const s of c.synergyCards) s.image = map(s.image)
  }
}

async function main() {
  const cache = await loadCache()

  console.log('Fetching EDHREC top commanders...')
  // Pull the top TARGET_COUNT ranked entries. Partner pairs later expand into two commanders
  // each (and some entries fail enrichment), so the final count is trimmed to TARGET_COUNT.
  let edhList: EdhrecCardView[] = []
  try {
    edhList = await fetchEdhrecTop(TARGET_COUNT)
  } catch (e) {
    console.warn(`EDHREC ranking fetch threw: ${(e as Error).message}`)
  }

  // Only trust a fresh ranking that looks complete; otherwise fall back to the last-good
  // cache so we never rebuild on top of a degraded/empty EDHREC response.
  let usingFreshRanking = edhList.length >= MIN_VALID
  if (!usingFreshRanking) {
    if (cache?.commanders?.length) {
      console.warn(
        `EDHREC returned ${edhList.length} (< ${MIN_VALID}); using cached ranking from ${cache.fetchedAt}.`,
      )
      edhList = cache.commanders
    } else {
      throw new Error(
        `EDHREC returned ${edhList.length} commanders and no cache exists — aborting to avoid a bad build.`,
      )
    }
  }
  console.log(
    `Using ${edhList.length} commanders from ${usingFreshRanking ? 'EDHREC (fresh)' : 'cache'}.`,
  )

  // Split partner pairings into their individual commanders (same rank, separate cards)
  // before any per-commander fetching, so synergy/enrichment run on each partner.
  const beforeExpand = edhList.length
  edhList = expandPartners(edhList)
  if (edhList.length !== beforeExpand) {
    console.log(`Expanded partner pairs: ${beforeExpand} -> ${edhList.length} commander entries.`)
  }

  console.log('Fetching synergy cards per commander from EDHREC...')
  const synergyNamesByCommander = new Map<string, string[]>()
  for (let i = 0; i < edhList.length; i++) {
    const edh = edhList[i]
    const slug = edh.sanitized
    if (!slug) continue
    let names: string[] = []
    try {
      names = await fetchSynergyNames(slug)
    } catch (e) {
      console.warn(`EDHREC synergy ${slug} threw: ${(e as Error).message}`)
    }
    // Per-commander fallback: if this fetch came back empty/failed but we have cached
    // synergy for the card, reuse it rather than dropping the commander's Synergy mode.
    if (names.length === 0 && cache?.synergy?.[edh.name]?.length) {
      names = cache.synergy[edh.name]
    }
    synergyNamesByCommander.set(edh.name, names)
    if ((i + 1) % 50 === 0) console.log(`  synergy: ${i + 1}/${edhList.length}`)
    await sleep(120)
  }

  // Persist the best data we now hold as the new last-good cache. Only overwrite the
  // ranking when EDHREC actually gave us a proper fresh one; always fold in whatever
  // synergy we resolved (fresh or cache-backed).
  const newCache: EdhrecCache = {
    fetchedAt: new Date().toISOString(),
    commanders: usingFreshRanking ? edhList : cache?.commanders ?? edhList,
    synergy: Object.fromEntries(synergyNamesByCommander),
  }
  await saveCache(newCache)

  console.log('Enriching via Scryfall (commanders + synergy cards)...')
  // One batch over the union of commander names and every synergy-card name.
  const allNames = new Set<string>()
  for (const e of edhList) allNames.add(e.name)
  for (const names of synergyNamesByCommander.values()) for (const n of names) allNames.add(n)
  const cards = await fetchScryfallBatch([...allNames])

  let commanders: Commander[] = []
  const seenNames = new Set<string>()
  for (const edh of edhList) {
    // Try full name, then the front-face half of DFC names ("A // B").
    const card = cards.get(norm(edh.name)) ?? cards.get(norm(edh.name.split(' // ')[0]))
    const synergyCards: SynergyCard[] = (synergyNamesByCommander.get(edh.name) ?? []).map((n) => {
      const sc = cards.get(norm(n)) ?? cards.get(norm(n.split(' // ')[0]))
      return {
        name: n,
        image: imageForName(n, cards),
        colorIdentity: sc?.color_identity ?? [],
      }
    })
    // Use EDHREC's own popularity rank: the two members of a partner pair share that pair's
    // rank, so ties are expected here and read as equally popular in the game.
    const c = toCommander(edh.rank ?? commanders.length + 1, edh, card, synergyCards)
    if (!c) {
      console.warn(`No card for: ${edh.name}`)
      continue
    }
    // The same commander can appear in several partner pairs (e.g. Rograkh). edhList is in
    // ascending-rank order, so keeping the first occurrence keeps each commander at its best
    // (most popular) rank. This also drops any DFC variants that resolve to one Scryfall card.
    if (seenNames.has(c.name)) {
      console.warn(`Duplicate card dropped: ${c.name} (from "${edh.name}")`)
      continue
    }
    seenNames.add(c.name)
    commanders.push(c)
  }
  // Keep every commander within the top TARGET_COUNT ranking spots (so e.g. the #500 single
  // is still included). Partner pairs share a spot — two commanders at one rank — so the
  // final list can exceed TARGET_COUNT entries even though ranks only span 1..TARGET_COUNT.
  commanders = commanders.filter((c) => c.rank <= TARGET_COUNT)

  // Guard: refuse to overwrite a good dataset with a degenerate one (e.g. Scryfall
  // enrichment mostly failed). Keep the existing committed commanders.json instead.
  if (commanders.length < MIN_VALID) {
    throw new Error(
      `Only built ${commanders.length} commanders (< ${MIN_VALID}); refusing to overwrite commanders.json.`,
    )
  }

  // Pull all images onto our own host and rewrite the dataset to local paths.
  await localizeImages(commanders)

  await mkdir(dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(commanders, null, 2), 'utf-8')
  console.log(`Wrote ${commanders.length} commanders to ${OUT_FILE}`)
  const withFlavor = commanders.filter((c) => c.flavorText).length
  const withArt = commanders.filter((c) => c.artCrop).length
  const withSynergy = commanders.filter((c) => c.synergyCards.length >= 4).length
  console.log(`  with flavor text: ${withFlavor}`)
  console.log(`  with art: ${withArt}`)
  console.log(`  with >=4 synergy cards: ${withSynergy}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
