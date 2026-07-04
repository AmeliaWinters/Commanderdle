/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Must be absolute: the SPA fallback serves index.html at nested routes like
  // /archive/classic/2026-07-01, where relative './assets/…' URLs would 404.
  base: '/',
  server: {
    // Honor a port injected via env (e.g. the preview harness) when present.
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
