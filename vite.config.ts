import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { devAuthMock } from './vite/devAuthMock'

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

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    deferMainCss(),
    ...(mode === 'authmock' ? [devAuthMock()] : []),
  ],
  base: '/',
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  preview: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
}))
