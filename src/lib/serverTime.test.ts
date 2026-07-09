import { describe, it, expect, vi, afterEach } from 'vitest'
import { syncServerTime, clockAheadPuzzles } from './serverTime'

const DAY = 86_400_000

function stubServerTime(ms: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      headers: { get: (k: string) => (k === 'date' ? new Date(ms).toUTCString() : null) },
    })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('clockAheadPuzzles', () => {
  it('is null before any successful sync', () => {
    expect(clockAheadPuzzles()).toBeNull()
  })

  it('is 0 when the device clock matches server time', async () => {
    stubServerTime(Date.now())
    await syncServerTime()
    expect(clockAheadPuzzles()).toBe(0)
  })

  it('reports how many days the device is set ahead of the server', async () => {
    stubServerTime(Date.now() - 2 * DAY)
    await syncServerTime()
    expect(clockAheadPuzzles()).toBe(2)
  })

  it('is not positive when the device is behind the server', async () => {
    stubServerTime(Date.now() + 2 * DAY)
    await syncServerTime()
    expect(clockAheadPuzzles()).toBeLessThanOrEqual(0)
  })

  it('stays unverified (no throw) when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    await expect(syncServerTime()).resolves.toBeUndefined()
  })
})
