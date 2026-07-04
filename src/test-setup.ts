import core from './data/commanders.core.json'
import { hydrateCommanders } from './lib/commanders'

// The app fetches the core dataset at runtime (see commanders.ts), but tests have no
// network — hydrate COMMANDERS synchronously from the bundled JSON before any test runs.
hydrateCommanders(core as Parameters<typeof hydrateCommanders>[0])

// jsdom's localStorage is unreliable across versions, so install a small
// in-memory implementation the stats/recap tests can rely on.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
})
