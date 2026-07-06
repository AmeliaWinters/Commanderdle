// Lightweight sound-effect player for commandle.
//
// Sound files live in /public/sounds. Playback is best-effort: browsers block
// audio until the first user gesture, and any failure to load/play is swallowed
// so the game never breaks over a missing sound. A mute preference is persisted
// in localStorage.

export type SoundName = 'guess' | 'win' | 'lose' | 'correct'

// 'correct' has no file: it's synthesized with WebAudio (see playChime) so a
// bright "ding" can ship without another audio asset.
const FILES: Record<Exclude<SoundName, 'correct'>, string> = {
  guess: '/sounds/guess.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
}

// All effects play at half volume.
const VOLUME = 0.5

const MUTE_KEY = 'commandle:muted'
const MUTE_EVENT = 'commandle:mute-change'

let muted = readMuted()
const cache = new Map<SoundName, HTMLAudioElement>()

let audioCtx: AudioContext | null = null

/**
 * A short two-note major-third chime for correct answers. Synthesized rather than
 * an mp3: it stays crisp at any playback rate and adds zero bytes to the bundle.
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audioCtx ??= new Ctx()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    const t0 = audioCtx.currentTime
    ;[
      { freq: 659.25, at: 0 }, // E5
      { freq: 830.61, at: 0.09 }, // G#5
    ].forEach(({ freq, at }) => {
      const osc = audioCtx!.createOscillator()
      const gain = audioCtx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t0 + at)
      gain.gain.linearRampToValueAtTime(VOLUME * 0.6, t0 + at + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.35)
      osc.connect(gain).connect(audioCtx!.destination)
      osc.start(t0 + at)
      osc.stop(t0 + at + 0.4)
    })
  } catch {
    /* ignore — sound is decorative */
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function element(name: Exclude<SoundName, 'correct'>): HTMLAudioElement | null {
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
  ;(Object.keys(FILES) as Array<Exclude<SoundName, 'correct'>>).forEach(element)
}

/**
 * Warm the audio cache lazily on the first user interaction rather than at load. The
 * effect files are decorative and browsers block playback until a gesture anyway, so
 * fetching them during initial paint only steals bandwidth from LCP-critical resources.
 * Idempotent; self-unsubscribes after the first gesture.
 */
export function preloadSoundsOnFirstGesture(): () => void {
  if (typeof window === 'undefined') return () => {}
  const events = ['pointerdown', 'keydown'] as const
  const onGesture = () => {
    preloadSounds()
    events.forEach((e) => window.removeEventListener(e, onGesture))
  }
  events.forEach((e) =>
    window.addEventListener(e, onGesture, { once: true, passive: true }),
  )
  return () => events.forEach((e) => window.removeEventListener(e, onGesture))
}

/** Play a sound effect. No-op when muted or when playback is blocked. */
export function playSound(name: SoundName) {
  if (muted) return
  if (name === 'correct') {
    playChime()
    return
  }
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
