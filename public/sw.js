/*
 * Commandle service worker — app-shell precache + runtime caching so a loaded puzzle
 * keeps working offline and installs as a PWA. Deliberately simple and cache-busting:
 * bump CACHE_VERSION to retire old caches on deploy.
 */
const CACHE_VERSION = 'commandle-v2'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/og-image.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Never cache API responses (community stats must stay live) or share/og pages.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/share/') || url.pathname.startsWith('/og/')) return

  // Navigations: network-first, fall back to the cached app shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }

  // Static assets (hashed JS/CSS, images, data): cache-first, then fill the cache.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy))
          }
          return res
        }),
    ),
  )
})
