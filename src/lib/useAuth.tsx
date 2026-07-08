/**
 * Auth context: fetches the current session (user + leaderboard stats) once on mount
 * and exposes it app-wide, plus refresh + logout. Fully degradable — if the backend
 * is absent the user is simply `null` and the app behaves as it does today.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchMe,
  fetchBinder,
  logout as apiLogout,
  onAccountStats,
  setLoggedInHint,
  type AccountStats,
  type AccountUser,
} from './auth'
import { beginAccountBinder, setAccountBinder, type Collection } from './collection'

interface AuthState {
  user: AccountUser | null
  stats: AccountStats | null
  /** True until the initial /me check resolves. */
  loading: boolean
  refresh: () => Promise<void>
  setUser: (user: AccountUser | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Keep the cheap "logged in" hint (used to skip account POSTs for anonymous
  // players) in sync with the real session state.
  useEffect(() => {
    setLoggedInHint(!!user)
  }, [user])

  // Swap the binder to the server's copy while signed in (source of truth, spoof-proof),
  // and back to the anonymous localStorage binder on logout.
  useEffect(() => {
    if (!user) {
      setAccountBinder(null)
      return
    }
    // Logged in: disregard localStorage immediately, even before the server binder
    // resolves, so a stale local binder never flashes over the account's real one.
    beginAccountBinder()
    let alive = true
    const controller = new AbortController()
    void fetchBinder(controller.signal).then((binder) => {
      if (alive) setAccountBinder((binder ?? {}) as Collection)
    })
    return () => {
      alive = false
      controller.abort()
    }
  }, [user])

  const refresh = useMemo(
    () => async () => {
      const me = await fetchMe()
      setUser(me.user)
      setStats(me.stats)
    },
    [],
  )

  // Live-update XP/stats the moment a result is recorded, so the account page and
  // widget reflect the new XP without a page refresh.
  useEffect(() => onAccountStats(setStats), [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    fetchMe(controller.signal)
      .then((me) => {
        if (!alive) return
        setUser(me.user)
        setStats(me.stats)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
      controller.abort()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      stats,
      loading,
      refresh,
      setUser,
      logout: async () => {
        await apiLogout()
        setUser(null)
        setStats(null)
      },
    }),
    [user, stats, loading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
