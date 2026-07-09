import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const CARDS_DIR = join('public', 'cards')
const OUT_DIR = join('public', 'cards-bg')
const CORE = join('src', 'data', 'commanders.core.json')
const WIDTH = 440
const QUALITY = 58

type Core = Array<{ normalImage?: string | null }>

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const core = JSON.parse(readFileSync(CORE, 'utf8')) as Core
  const existing = new Set(readdirSync(OUT_DIR))

  const files = [
    ...new Set(
      core
        .map((c) => c.normalImage)
        .filter((p): p is string => Boolean(p) && /^\/?cards\/normal_/.test(p!))
        .map((p) => p.replace(/^\/?cards\//, '')),
    ),
  ]

  let made = 0
  let skipped = 0
  for (const file of files) {
    const src = join(CARDS_DIR, file)
    if (!existsSync(src)) continue
    if (existing.has(file)) {
      skipped++
      continue
    }
    await sharp(src).resize({ width: WIDTH }).webp({ quality: QUALITY }).toFile(join(OUT_DIR, file))
    made++
  }
  console.log(`cards-bg: ${made} generated, ${skipped} already present (${files.length} total).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
