/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { devAuthMock } from './vite/devAuthMock'

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
export default defineConfig(({ mode }) => ({
  // `npm run dev:auth` (mode `authmock`) serves a fake account backend from the dev
  // server so the login / account / leaderboard screens can be iterated on with HMR,
  // no `npm run build` + `wrangler dev` needed. Dev-only; never in the production build.
  plugins: [
    react(),
    deferMainCss(),
    ...(mode === 'authmock' ? [devAuthMock()] : []),
  ],
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
}))
