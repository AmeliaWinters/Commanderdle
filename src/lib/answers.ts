import type { Commander, Mode } from '../types/commander'
import answersUrl from '../data/answers.json?url'
import { commanderByName, ensureVaultLoaded } from './commanders'
import { dailyAnswer } from './dailyAnswer'

type AnswersFile = Record<string, Partial<Record<Mode, string>>>

let answers: AnswersFile = {}
let answersPromise: Promise<void> | null = null

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

export function frozenAnswerName(mode: Mode, date: string): string | null {
  return answers[date]?.[mode] ?? null
}

export function ensureArchiveData(): Promise<void> {
  return Promise.all([ensureAnswersLoaded(), ensureVaultLoaded()]).then(() => undefined)
}

export function resolveArchiveAnswer(mode: Mode, date: string): Commander {
  const name = frozenAnswerName(mode, date)
  if (name) {
    const commander = commanderByName(name)
    if (commander) return commander
  }
  return dailyAnswer(mode, date)
}
