/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Honor a port injected via env (e.g. the preview harness) when present.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
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
