import { msUntilNextPuzzle } from './dailyAnswer'

const ENABLED_KEY = 'commandle:reminder'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function isReminderEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

function setEnabledFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(ENABLED_KEY, '1')
    else localStorage.removeItem(ENABLED_KEY)
  } catch {
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

export function scheduleReminder(): void {
  clearTimer()
  if (!notificationsSupported()) return
  if (!isReminderEnabled() || Notification.permission !== 'granted') return
  timer = setTimeout(() => {
    try {
      new Notification('New Commandle is live', {
        body: "Today's commander puzzles are ready - keep your streak going!",
        icon: '/icon-192.png',
        badge: '/favicon-32.png',
      })
    } catch {
    }
    scheduleReminder()
  }, msUntilNextPuzzle() + 1000)
}

export async function toggleReminder(): Promise<boolean> {
  if (isReminderEnabled()) {
    setEnabledFlag(false)
    clearTimer()
    return false
  }
  if (!notificationsSupported()) return false
  let perm = Notification.permission
  if (perm === 'default') {
    try {
      perm = await Notification.requestPermission()
    } catch {
      return false
    }
  }
  if (perm !== 'granted') {
    setEnabledFlag(false)
    return false
  }
  setEnabledFlag(true)
  scheduleReminder()
  return true
}
