import type { Commander, Mode } from '../types/commander'
import answersUrl from '../data/answers.json?url'
import { commanderByName, ensureVaultLoaded } from './commanders'
import { dailyAnswer } from './dailyAnswer'

/**
 * Frozen daily answers. The live daily answer is computed on the fly from *today's* top-500
 * pool (see dailyAnswer), which changes every day as EDHREC rankings shift — so recomputing a
 * *past* day's answer against the current pool would give a different, drifting result. To keep
 * the archive retroactive, the daily build appends each day's answer here (append-only, keyed
 * by date → mode → commander name); past archive plays read the frozen name instead of
 * recomputing. Dates from before this file existed simply aren't present and fall back to the
 * live computation (best-effort, exactly the old behaviour).
 */
type AnswersFile = Record<string, Partial<Record<Mode, string>>>

let answers: AnswersFile = {}
let answersPromise: Promise<void> | null = null

/** Lazily fetch the frozen-answers map. Best-effort: a failure leaves it empty (live fallback). */
export function ensureAnswersLoaded(): Promise<void> {
  if (!answersPromise) {
    const fetchAnswers = () => fetch(answersUrl).then((r) => r.json() as Promise<AnswersFile>)
    answersPromise = fetchAnswers()
      .catch(() => fetchAnswers())
      .then((data) => {
        answers = data ?? {}
      })
      .catch(() => undefined)
  }
  return answersPromise
}

/** The frozen answer name for a past mode+date, or null if none was recorded. */
export function frozenAnswerName(mode: Mode, date: string): string | null {
  return answers[date]?.[mode] ?? null
}

/** Load everything the archive needs to resolve a past answer (frozen names + retired data). */
export function ensureArchiveData(): Promise<void> {
  return Promise.all([ensureAnswersLoaded(), ensureVaultLoaded()]).then(() => undefined)
}

/**
 * Resolve the answer for a past archive date. Prefers the frozen name (resolved via the live
 * pool or the retired-commander vault); falls back to the live computation for dates with no
 * frozen record. Call only after ensureArchiveData() has resolved so the vault is populated.
 */
export function resolveArchiveAnswer(mode: Mode, date: string): Commander {
  const name = frozenAnswerName(mode, date)
  if (name) {
    const commander = commanderByName(name)
    if (commander) return commander
  }
  return dailyAnswer(mode, date)
}
