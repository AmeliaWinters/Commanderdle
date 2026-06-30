/**
 * build-data.ts
 *
 * Generates src/data/commanders.json — the static dataset the app ships with.
 *
 * Pipeline:
 *   1. Pull the EDHREC "top commanders (past 2 years)" ranked list (paginated, 100/page).
 *   2. Take the top 500 names.
 *   3. Enrich each via Scryfall's /cards/collection batch endpoint (75 ids/request) to get
 *      color identity, type, mana value, power/toughness, rarity, release year, flavor text,
 *      and image URIs.
 *   4. Write the merged, ranked dataset to src/data/commanders.json.
 *
 * Run with: npm run build:data
 *
 * Both APIs are free and require no key. Scryfall asks for a descriptive User-Agent and a
 * ~50-100ms delay between requests, which we honor.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = join(__dirname, '..', 'src', 'data', 'commanders.json')

const TARGET_COUNT = 500
// EDHREC's JSON host sits behind Cloudflare and 403s non-browser User-Agents.
const EDHREC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
// Scryfall asks for a descriptive User-Agent identifying the app.
const SCRYFALL_UA = 'Commanderdle/0.1 (https://github.com/AmeliaWinters/Commanderdle)'
const EDHREC_BASE = 'https://json.edhrec.com/pages/'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

async function main() {
  console.log('Fetching EDHREC top commanders...')
  // Over-fetch: some EDHREC entries collapse to the same Scryfall card (partner variants)
  // or fail enrichment, so we pull a buffer and trim to exactly TARGET_COUNT afterward.
  const edhList = await fetchEdhrecTop(TARGET_COUNT + 30)
  console.log(`Got ${edhList.length} commanders from EDHREC.`)

  console.log('Fetching synergy cards per commander from EDHREC...')
  const synergyNamesByCommander = new Map<string, string[]>()
  for (let i = 0; i < edhList.length; i++) {
    const edh = edhList[i]
    const slug = edh.sanitized
    if (!slug) continue
    const names = await fetchSynergyNames(slug)
    synergyNamesByCommander.set(edh.name, names)
    if ((i + 1) % 50 === 0) console.log(`  synergy: ${i + 1}/${edhList.length}`)
    await sleep(120)
  }

  console.log('Enriching via Scryfall (commanders + synergy cards)...')
  // One batch over the union of commander names and every synergy-card name.
  const allNames = new Set<string>()
  for (const e of edhList) allNames.add(e.name)
  for (const names of synergyNamesByCommander.values()) for (const n of names) allNames.add(n)
  const cards = await fetchScryfallBatch([...allNames])

  const commanders: Commander[] = []
  const seenNames = new Set<string>()
  let rank = 0
  for (const edh of edhList) {
    rank++
    // Try full name, then the front-face half of partner/DFC names ("A // B").
    const card = cards.get(norm(edh.name)) ?? cards.get(norm(edh.name.split(' // ')[0]))
    const synergyCards: SynergyCard[] = (synergyNamesByCommander.get(edh.name) ?? []).map((n) => ({
      name: n,
      image: imageForName(n, cards),
    }))
    const c = toCommander(rank, edh, card, synergyCards)
    if (!c) {
      console.warn(`No card for: ${edh.name}`)
      continue
    }
    // EDHREC can list the same card under two raw names (e.g. partner variants) that
    // both resolve to one Scryfall card. Keep only the first (highest-ranked).
    if (seenNames.has(c.name)) {
      console.warn(`Duplicate card dropped: ${c.name} (from "${edh.name}")`)
      continue
    }
    seenNames.add(c.name)
    commanders.push(c)
  }
  // Trim the over-fetched buffer down to exactly the target count, then re-rank
  // sequentially (1..TARGET_COUNT) after dropping any duplicates/failed enrichment.
  commanders.length = Math.min(commanders.length, TARGET_COUNT)
  commanders.forEach((c, i) => (c.rank = i + 1))

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
