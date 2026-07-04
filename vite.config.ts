/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Bake the LCP backdrop card into the HTML so it paints before the app JS boots.
 *
 * The largest floating card (CardBackdrop CARDS[3]) is the page's Largest Contentful
 * Paint, but as a React-rendered <img> it can't appear until ~110KB of JS downloads and
 * executes — pinning LCP to ~6s on throttled mobile. This plugin reproduces
 * CardBackdrop.pickRealImages for that one slot at build time. The pick is a pure function
 * of the day-of-month (offset = getDate() % pool, slot 3), so there are only 31 possible
 * images; we bake all 31 and let a tiny inline head script choose today's at runtime,
 * preload it, and drop the <img> into #boot-backdrop on DOMContentLoaded. React later
 * renders the byte-identical card in the same slot, so nothing shifts and no larger LCP
 * candidate appears afterwards.
 */
function backdropLcpPreload(): Plugin {
  const SLOT = 3 // CARDS[3] is the largest card at every breakpoint → the LCP element.
  return {
    name: 'backdrop-lcp-preload',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const coreUrl = new URL('./src/data/commanders.core.json', import.meta.url)
        const core = JSON.parse(readFileSync(fileURLToPath(coreUrl), 'utf8')) as Array<{
          normalImage?: string | null
          artCrop?: string | null
        }>
        // Same source list, order and resolution (base '/') as commanders.ts + zoomPool.
        const imgs = core
          .map((c) => c.normalImage ?? c.artCrop)
          .filter((s): s is string => Boolean(s))
          .map((p) => '/' + p.replace(/^\//, ''))
          // Match CardBackdrop.toBackdropVariant: serve the smaller /cards-bg/ file.
          .map((p) => p.replace(/\/cards\/(normal_[^/]+)$/, '/cards-bg/$1'))
        const len = imgs.length
        if (!len) return html
        const step = Math.max(1, Math.floor(len / 6)) // mirrors pickRealImages
        // manifest[d] = the LCP card for day-of-month d (1–31), matching pickRealImages.
        const manifest: Record<number, string> = {}
        for (let d = 1; d <= 31; d++) manifest[d] = imgs[((d % len) + SLOT * step) % len]

        const script = `(function(){var M=${JSON.stringify(manifest)},s=M[new Date().getDate()];if(!s)return;var l=document.createElement("link");l.rel="preload";l.setAttribute("as","image");l.setAttribute("fetchpriority","high");l.href=s;document.head.appendChild(l);addEventListener("DOMContentLoaded",function(){var h=document.getElementById("boot-backdrop");if(!h)return;var t=Math.min(1,Math.max(0,((window.innerWidth||900)-450)/450)),i=new Image();i.className="bg-card bg-card-real";i.alt="";i.decoding="async";i.setAttribute("fetchpriority","high");i.style.cssText="left:0%;top:"+(50+20*t)+"%;width:250px;height:350px;--rot:-16deg;animation-duration:30s;animation-delay:-10s";i.src=s;h.appendChild(i)})})();`

        return {
          html,
          // head-prepend so the preload fires as early as possible in document parse.
          tags: [{ tag: 'script', injectTo: 'head-prepend', children: script }],
        }
      },
    },
  }
}

/**
 * Take the main stylesheet off the critical render path.
 *
 * Vite injects the app CSS as a render-blocking <link rel="stylesheet">, which blocks even
 * the inline-styled boot skeleton (and the LCP card) from painting until it downloads
 * (~150ms). The real app UI is styled by this sheet but doesn't render until React mounts —
 * and React's mount is gated on the async core-data fetch (see main.tsx), which is larger
 * and finishes later than this ~9KB (gzip) sheet. So we can load it non-blocking via the
 * rel=preload swap and let the skeleton paint sooner, with zero risk of unstyled app
 * content. A <noscript> fallback keeps it blocking when JS is off.
 */
function deferMainCss(): Plugin {
  return {
    name: 'defer-main-css',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /<link rel="stylesheet"([^>]*?)href="([^"]+\.css)"[^>]*>/,
          (_m, attrs: string, href: string) =>
            `<link rel="preload" as="style"${attrs}href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet"${attrs}href="${href}"></noscript>`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), backdropLcpPreload(), deferMainCss()],
  // Must be absolute: the SPA fallback serves index.html at nested routes like
  // /archive/classic/2026-07-01, where relative './assets/…' URLs would 404.
  base: '/',
  server: {
    // Honor a port injected via env (e.g. the preview harness) when present.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  preview: {
    // Same for `vite preview` (the production-bundle server), so the preview harness can
    // assign it a free port instead of colliding on the default 4173.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  build: {
    rollupOptions: {
      output: {
        // Keep React in its own long-lived chunk so app-code changes don't bust
        // the framework cache for returning players.
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    // jsdom gives the pure-logic tests a localStorage (stats.ts) and lets the
    // ManaSymbols import used by deduce.ts resolve without a real browser.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
