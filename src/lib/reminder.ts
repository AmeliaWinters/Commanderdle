import { msUntilNextPuzzle } from './dailyAnswer'

/**
 * A "remind me" nudge with zero backend: while the tab is open we set a timer for the next
 * local midnight and fire a browser notification when the new puzzle unlocks. This can only
 * fire while a Commandle tab is alive, so it degrades gracefully - no push server, no cost.
 */

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
    /* ignore */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

/** (Re)arm the midnight timer if reminders are on and permission is granted. */
export function scheduleReminder(): void {
  clearTimer()
  if (!notificationsSupported()) return
  if (!isReminderEnabled() || Notification.permission !== 'granted') return
  // Fire a moment after rollover so the new puzzle is definitely live.
  timer = setTimeout(() => {
    try {
      new Notification('New Commandle is live', {
        body: "Today's commander puzzles are ready - keep your streak going!",
        icon: '/icon-192.png',
        badge: '/favicon-32.png',
      })
    } catch {
      /* ignore */
    }
    scheduleReminder() // arm the following day in case the tab stays open
  }, msUntilNextPuzzle() + 1000)
}

/**
 * Toggle reminders. When turning on, requests notification permission.
 * Returns the resulting enabled state (false if permission was denied).
 */
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
