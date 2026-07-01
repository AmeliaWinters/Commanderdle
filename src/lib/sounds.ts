// Lightweight sound-effect player for Commanderdle.
//
// Sound files live in /public/sounds. Playback is best-effort: browsers block
// audio until the first user gesture, and any failure to load/play is swallowed
// so the game never breaks over a missing sound. A mute preference is persisted
// in localStorage.

export type SoundName = 'guess' | 'win' | 'lose'

const FILES: Record<SoundName, string> = {
  guess: '/sounds/guess.wav',
  win: '/sounds/win.wav',
  lose: '/sounds/lose.wav',
}

// All effects play at half volume.
const VOLUME = 0.5

const MUTE_KEY = 'commanderdle:muted'
const MUTE_EVENT = 'commanderdle:mute-change'

let muted = readMuted()
const cache = new Map<SoundName, HTMLAudioElement>()

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function element(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  let el = cache.get(name)
  if (!el) {
    el = new Audio(FILES[name])
    el.preload = 'auto'
    el.volume = VOLUME
    cache.set(name, el)
  }
  return el
}

/** Warm the audio cache so the first real play has no fetch latency. */
export function preloadSounds() {
  ;(Object.keys(FILES) as SoundName[]).forEach(element)
}

/** Play a sound effect. No-op when muted or when playback is blocked. */
export function playSound(name: SoundName) {
  if (muted) return
  const el = element(name)
  if (!el) return
  try {
    el.currentTime = 0
    el.volume = VOLUME
    void el.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0')
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: next }))
}

export function toggleMuted(): boolean {
  setMuted(!muted)
  return muted
}

/** Subscribe to mute-state changes; returns an unsubscribe function. */
export function onMuteChange(cb: (muted: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail)
  window.addEventListener(MUTE_EVENT, handler)
  return () => window.removeEventListener(MUTE_EVENT, handler)
}
