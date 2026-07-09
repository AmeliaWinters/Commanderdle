
export type SoundName = 'guess' | 'win' | 'lose' | 'correct'

const FILES: Record<Exclude<SoundName, 'correct'>, string> = {
  guess: '/sounds/guess.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3',
}

const VOLUME = 0.5

const MUTE_KEY = 'commandle:muted'
const MUTE_EVENT = 'commandle:mute-change'

let muted = readMuted()
const cache = new Map<SoundName, HTMLAudioElement>()

let audioCtx: AudioContext | null = null

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
      { freq: 659.25, at: 0 },
      { freq: 830.61, at: 0.09 },
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

export function preloadSounds() {
  ;(Object.keys(FILES) as Array<Exclude<SoundName, 'correct'>>).forEach(element)
}

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
  }
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: next }))
}

export function toggleMuted(): boolean {
  setMuted(!muted)
  return muted
}

export function onMuteChange(cb: (muted: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail)
  window.addEventListener(MUTE_EVENT, handler)
  return () => window.removeEventListener(MUTE_EVENT, handler)
}
