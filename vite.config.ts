import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { devAuthMock } from './vite/devAuthMock'

// Strip HTML comments and inline-<style> CSS comments from index.html in the
// production build. Vite ships index.html (and its inline <style>) verbatim, so
// without this, implementation notes in the source HTML end up in the page that
// crawlers and scrapers read. Dev is left untouched so the source stays readable.
function stripHtmlComments(): Plugin {
  return {
    name: 'strip-html-comments',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html
          // CSS comments inside inline <style> blocks
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (block) =>
            block.replace(/\/\*[\s\S]*?\*\//g, ''),
          )
          // HTML comments — but keep the ld+json/script contents intact (they
          // contain no HTML comments, so a plain strip is safe here)
          .replace(/<!--[\s\S]*?-->/g, '')
          // collapse the blank lines the removals leave behind
          .replace(/\n\s*\n\s*\n/g, '\n\n')
      },
    },
  }
}

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
    stripHtmlComments(),
    ...(mode === 'authmock' ? [devAuthMock()] : []),
  ],
  esbuild: {
    // Drop all comments (including legal/license banners) from the JS output so
    // none survive into the production bundle.
    legalComments: 'none',
  },
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
