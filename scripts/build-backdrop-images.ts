/**
 * Generate downscaled, more-compressed variants of the card art used by the decorative
 * floating backdrop (CardBackdrop.tsx), written to public/cards-bg/.
 *
 * The backdrop renders full-card `normal_*` images at <=250px CSS width and 0.3 opacity, but
 * was serving the same ~67KB files Zoom mode uses at full size — and the largest one is the
 * page's LCP element, so those bytes sit on the critical path. Zoom mode still needs the
 * crisp originals, so rather than recompress those in place we emit a separate backdrop-only
 * variant (440px wide — enough for a 250px card at ~1.75x DPR — at webp q58, roughly halving
 * the bytes). CardBackdrop and the backdrop-lcp-preload build plugin rewrite `/cards/` to
 * `/cards-bg/` to pick these up.
 *
 * Run:  npm run build:backdrop   (idempotent; skips files already generated)
 */
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

  // Only the `normal_*` files that live under public/cards/ (skip legacy absolute URLs).
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
