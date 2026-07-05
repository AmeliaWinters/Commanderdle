/**
 * Landing page for a shared result. A crawler (Twitter, Facebook, Discord, iMessage…) reads
 * the per-result Open Graph tags here — including og:image pointing at the dynamic PNG — so the
 * link unfurls into a rich card. A human is bounced straight to the live puzzle so a shared
 * result is always a one-tap entry point into the game.
 *
 * Cloudflare Pages Function. No data store — everything is derived from the URL.
 */
import { deriveResult, isShareMode, isValidGridCode, MODE_LABEL, MODE_PATH } from '../../../../src/lib/shareCode'

interface Params {
  mode: string
  puzzle: string
  grid: string
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

export const onRequest = (context: { params: Params; request: Request }): Response => {
  const { mode, puzzle, grid } = context.params
  if (!isShareMode(mode)) return new Response('Not found', { status: 404 })
  if (!isValidGridCode(grid)) return new Response('Not found', { status: 404 })

  const origin = new URL(context.request.url).origin
  const { won, score } = deriveResult(mode, grid)
  const label = MODE_LABEL[mode]
  const playPath = MODE_PATH[mode]
  // The grid rides along so the app can replay the sender's run as a live
  // "ghost race"; the puzzle number lets it reject stale (non-today) ghosts.
  const ghostParam = /^\d{1,6}$/.test(puzzle) ? `&ghost=${grid}&p=${puzzle}` : ''
  const playUrl = `${origin}${playPath}?from=share${ghostParam}`

  const title = `Commandle ${label} #${puzzle} - ${won ? `solved in ${score}` : 'missed it'}`
  const description = won
    ? `I solved today's Commandle ${label} in ${score}. Think you can beat me?`
    : `Today's Commandle ${label} got me. Can you solve it?`
  const image = `${origin}/og/${mode}/${puzzle}/${grid}`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Commandle" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(playUrl)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<link rel="canonical" href="${escapeHtml(origin + playPath)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(playUrl)}" />
<script>window.location.replace(${JSON.stringify(playUrl)});</script>
</head>
<body style="background:#0b0b0d;color:#f4f4f6;font-family:sans-serif;text-align:center;padding:48px;">
<p>Opening Commandle… <a href="${escapeHtml(playUrl)}" style="color:#ec5a1c;">tap here if it doesn't load</a>.</p>
</body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short cache: crawlers refetch, humans redirect instantly.
      'cache-control': 'public, max-age=300',
    },
  })
}
