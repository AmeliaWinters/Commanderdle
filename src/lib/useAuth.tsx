import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { syncLocalDailyResults } from './syncResults'

interface AuthState {
  user: AccountUser | null
  stats: AccountStats | null
  pendingFriendRequests: number
  loading: boolean
  refresh: () => Promise<void>
  setUser: (user: AccountUser | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoggedInHint(!!user)
  }, [user])

  const syncedRef = useRef(false)
  useEffect(() => {
    if (!user) {
      syncedRef.current = false
      return
    }
    if (syncedRef.current) return
    syncedRef.current = true
    void syncLocalDailyResults()
  }, [user])

  useEffect(() => {
    if (!user) {
      setAccountBinder(null)
      return
    }
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
      setPendingFriendRequests(me.pendingFriendRequests)
    },
    [],
  )

  useEffect(() => onAccountStats(setStats), [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    fetchMe(controller.signal)
      .then((me) => {
        if (!alive) return
        setUser(me.user)
        setStats(me.stats)
        setPendingFriendRequests(me.pendingFriendRequests)
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
      pendingFriendRequests,
      loading,
      refresh,
      setUser,
      logout: async () => {
        await apiLogout()
        setUser(null)
        setStats(null)
        setPendingFriendRequests(0)
      },
    }),
    [user, stats, pendingFriendRequests, loading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
