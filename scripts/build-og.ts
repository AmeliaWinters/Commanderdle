/*
 * Builds the static social-preview hero (public/og-image.png): real Magic card art behind a
 * dark scrim and the branded wordmark. Uses the satori + resvg pipeline (real font rendering
 * with Cinzel / EB Garamond) — the same engine as the dynamic share cards.
 *
 * Run: npx tsx scripts/build-og.ts
 */
import satori from 'satori'
import { html } from 'satori-html'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const W = 1200
const H = 630

/** Fetch a Google Font as a TTF buffer (legacy UA forces TTF over woff2). */
async function fetchFont(css2: string): Promise<Buffer> {
  const css = await (await fetch(css2, { headers: { 'User-Agent': 'Mozilla/4.0' } })).text()
  const url = css.match(/https:\/\/[^)]+\.ttf/)?.[0]
  if (!url) throw new Error(`No TTF url for ${css2}`)
  return Buffer.from(await (await fetch(url)).arrayBuffer())
}

async function main() {
  const [cinzel, garamond] = await Promise.all([
    fetchFont('https://fonts.googleapis.com/css2?family=Cinzel:wght@900'),
    fetchFont('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@600'),
  ])

  // Hero art — The Ur-Dragon (epic, five-colour: reads instantly as "commander").
  const heroArt = resolve(ROOT, 'public/cards/art_crop_10d42b35-844f-4a64-9981-c6118d45e826.webp')
  const artPng = await sharp(heroArt)
    .resize(W, H, { fit: 'cover', position: 'top' })
    .modulate({ saturation: 1.08 })
    .png()
    .toBuffer()

  // satori renders only the scrim + text on a transparent canvas; sharp composites it over
  // the art. Keeping <img> out of satori avoids its numeric-dimension quirks entirely.
  const raw = `
    <div style="display:flex;width:${W}px;height:${H}px;">
      <div style="display:flex;position:absolute;top:0;left:0;width:${W}px;height:${H}px;background:linear-gradient(to top, #08080a 24%, rgba(8,8,10,0.82) 46%, rgba(8,8,10,0.22) 74%, rgba(8,8,10,0) 100%);"></div>
      <div style="display:flex;flex-direction:column;position:absolute;left:72px;bottom:70px;">
        <div style="display:flex;width:56px;height:5px;border-radius:3px;background:linear-gradient(90deg,#f6a01a,#c01f1f);margin-bottom:20px;"></div>
        <div style="display:flex;font-family:'EB Garamond';font-size:29px;color:#e7e7ee;">THE DAILY MTG COMMANDER GUESSING GAME</div>
        <div style="display:flex;font-size:128px;font-weight:900;margin-top:4px;"><span style="color:#fafafc;">Comman</span><span style="color:#ee5f22;">dle</span></div>
        <div style="display:flex;font-family:'EB Garamond';font-size:33px;color:#f3894a;margin-top:18px;">Classic · Silhouette · Zoom · Synergy · Quote</div>
      </div>
    </div>`

  const markup = html(raw.replace(/>\s+</g, '><').trim())

  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: [
      { name: 'Cinzel', data: cinzel, weight: 900, style: 'normal' },
      { name: 'EB Garamond', data: garamond, weight: 600, style: 'normal' },
    ],
  })
  const overlayPng = new Resvg(svg, { background: 'rgba(0,0,0,0)' }).render().asPng()

  await sharp(artPng)
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .png()
    .toFile(resolve(ROOT, 'public/og-image.png'))
  console.log('Wrote public/og-image.png (hero: The Ur-Dragon)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
