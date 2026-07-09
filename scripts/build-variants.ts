import { writeFile, mkdir, readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const WEBP_QUALITY = 80
const __dirname = dirname(fileURLToPath(import.meta.url))
const CORE_FILE = join(__dirname, '..', 'src', 'data', 'commanders.core.json')
const VARIANTS_FILE = join(__dirname, '..', 'src', 'data', 'commanders.variants.json')
const CARDS_DIR = join(__dirname, '..', 'public', 'cards')
const SCRYFALL_UA = 'Commanderdle/0.1 (https://github.com/AmeliaWinters/Commanderdle)'
const HEADERS = { 'User-Agent': SCRYFALL_UA, Accept: 'application/json' }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const fileExists = (p: string) =>
  access(p).then(
    () => true,
    () => false,
  )

interface ScryfallCard {
  name: string
  set_name?: string
  collector_number?: string
  illustration_id?: string
  prints_search_uri?: string
  card_faces?: Array<{ illustration_id?: string; image_uris?: { art_crop?: string; normal?: string } }>
  image_uris?: { art_crop?: string; normal?: string }
}

interface ArtVariant {
  id: string
  artCrop: string | null
  normalImage: string | null
  setName: string
  number: string
}

const illustrationId = (card: ScryfallCard): string | null =>
  card.illustration_id ?? card.card_faces?.[0]?.illustration_id ?? null
const variantId = (illId: string): string => illId.replace(/-/g, '').slice(0, 12)

function localFileName(url: string): string {
  const { pathname } = new URL(url)
  const parts = pathname.split('/').filter(Boolean)
  const size = parts[0] ?? 'img'
  const base = parts[parts.length - 1] ?? 'card.jpg'
  const name = `${size}_${base}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  return name.replace(/\.[a-z0-9]+$/i, '') + '.webp'
}

async function get(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: HEADERS })
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1))
      continue
    }
    return res
  }
  return null
}

async function fetchPrints(url: string): Promise<ScryfallCard[]> {
  const u = new URL(url)
  u.searchParams.set('include_extras', 'true')
  u.searchParams.set('include_variations', 'true')
  u.searchParams.set('unique', 'prints')
  const out: ScryfallCard[] = []
  let next: string | undefined = u.toString()
  let page = 0
  while (next && page < 12) {
    const res = await get(next)
    if (!res || !res.ok) break
    const json: any = await res.json()
    for (const c of (json.data ?? []) as ScryfallCard[]) out.push(c)
    next = json.has_more ? json.next_page : undefined
    page++
    await sleep(120)
  }
  return out
}

const toWebp = (buf: Buffer) => sharp(buf).webp({ quality: WEBP_QUALITY }).toBuffer()

async function localize(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return url
  const file = localFileName(url)
  const dest = join(CARDS_DIR, file)
  const localPath = `cards/${file}`
  if (await fileExists(dest)) return localPath
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await writeFile(dest, await toWebp(Buffer.from(await res.arrayBuffer())))
    return localPath
  } catch (e) {
    console.warn(`Image download failed (${(e as Error).message}): ${url}`)
    return url
  }
}

async function main() {
  await mkdir(CARDS_DIR, { recursive: true })
  const core = JSON.parse(await readFile(CORE_FILE, 'utf-8')) as Array<{ name: string }>
  const result: Record<string, ArtVariant[]> = {}
  let totalVariants = 0

  for (let i = 0; i < core.length; i++) {
    const name = core[i].name
    const front = name.split(' // ')[0]
    const cardRes = await get(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(front)}`,
    )
    if (!cardRes || !cardRes.ok) {
      console.warn(`skip ${name}: ${cardRes ? cardRes.status : 'no response'}`)
      continue
    }
    const card = (await cardRes.json()) as ScryfallCard
    await sleep(90)

    const prints = await fetchPrints(card.prints_search_uri ?? '')
    const seen = new Set<string>()
    const defaultIll = illustrationId(card)
    if (defaultIll) seen.add(variantId(defaultIll))

    const variants: ArtVariant[] = []
    for (const p of prints) {
      const ill = illustrationId(p)
      if (!ill) continue
      const id = variantId(ill)
      if (seen.has(id)) continue
      seen.add(id)
      const imgs = p.image_uris ?? p.card_faces?.[0]?.image_uris
      if (!imgs?.art_crop) continue
      variants.push({
        id,
        artCrop: await localize(imgs.art_crop),
        normalImage: await localize(imgs.normal ?? null),
        setName: p.set_name ?? '',
        number: p.collector_number ?? '',
      })
    }
    if (variants.length) {
      result[name] = variants
      totalVariants += variants.length
    }
    await writeFile(VARIANTS_FILE, JSON.stringify(result) + '\n', 'utf-8')
    if ((i + 1) % 25 === 0)
      console.log(`  ${i + 1}/${core.length} commanders, ${totalVariants} variants so far`)
    await sleep(90)
  }

  console.log(
    `Wrote ${totalVariants} variants across ${Object.keys(result).length} commanders -> ${VARIANTS_FILE}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
