import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createClient } from 'lib/supabase/client'
import { CONFIG } from 'constants/config'
import { logger } from 'utils/logger'

export interface Folder {
  id: string
  name: string
  created_at: string
  reels?: { count: number }[]
  reelsCount?: number
  parent_id?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
  updated_at?: string
}

interface AppContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  folders: Folder[]
  refreshFolders: () => Promise<void>
  theme: 'dark' | 'light'
  toggleTheme: () => Promise<void>
  user: any
  loading: boolean
  isAddFolderOpen: boolean
  setIsAddFolderOpen: (open: boolean) => void
  refreshUser: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const supabase = createClient()

  // Fetch current user and theme
  const fetchUser = useCallback(async () => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      try {
        await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (e) {
        logger.error('Error exchanging OAuth code:', e)
      }
    }

    const timeout = setTimeout(() => {
      setLoading(false)
    }, 4000)

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)

        // Fetch user profile theme
        const { data: profile } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', authUser.id)
          .single()

        if (profile?.theme) {
          const loadedTheme = profile.theme as 'dark' | 'light'
          setTheme(loadedTheme)
          document.documentElement.setAttribute('data-theme', loadedTheme)
        }
      } else {
        setUser(null)
      }
    } catch (err) {
      logger.error('Error fetching user:', err)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }, [supabase])

  // Fetch folders (including subfolders, excluding deleted ones)
  const refreshFolders = useCallback(async () => {
    if (!user) return
    try {
      // 1. Fetch active folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // 2. Fetch active reels to count them per folder
      const { data: reelsData } = await supabase
        .from('reels')
        .select('folder_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      // Handle the reels count aggregation
      const processed = (foldersData || []).map(f => {
        const count = (reelsData || []).filter(r => r.folder_id === f.id).length
        return {
          ...f,
          reelsCount: count
        }
      })

      setFolders(processed)
    } catch (err) {
      logger.error('Error refreshing folders:', err)
    }
  }, [user, supabase])

  // Toggle theme
  const toggleTheme = async () => {
    if (!user) return
    const newTheme = theme === CONFIG.THEMES.DARK ? CONFIG.THEMES.LIGHT : CONFIG.THEMES.DARK
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)

    // Save to DB
    await supabase
      .from('profiles')
      .update({ theme: newTheme })
      .eq('id', user.id)
  }

  // Load user details on mount
  useEffect(() => {
    fetchUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        // Store session start time if not set, or refresh on login
        const storedStartTime = localStorage.getItem('session_start_time')
        if (event === 'SIGNED_IN' || !storedStartTime) {
          localStorage.setItem('session_start_time', Date.now().toString())
        }
      } else {
        const hasAuthParams =
          window.location.search.includes('code=') ||
          window.location.hash.includes('access_token=')

        if (!hasAuthParams) {
          setUser(null)
          localStorage.removeItem('session_start_time')
          if (pathnameRef.current !== '/login') {
            navigate('/login')
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser, supabase, navigate])

  // Session expiry check (6 hours)
  useEffect(() => {
    if (!user) return

    const checkSessionExpiry = async () => {
      const storedStartTime = localStorage.getItem('session_start_time')
      if (storedStartTime) {
        const startTime = parseInt(storedStartTime, 10)
        if (Date.now() - startTime >= CONFIG.SESSION_EXPIRY_MS) {
          logger.info('Session expired after 6 hours. Logging out...')
          localStorage.removeItem('session_start_time')
          await supabase.auth.signOut()
          navigate('/login')
        }
      } else {
        localStorage.setItem('session_start_time', Date.now().toString())
      }
    }

    checkSessionExpiry()
    const interval = setInterval(checkSessionExpiry, CONFIG.SESSION_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, supabase, navigate])

  // Load folders once user is set
  useEffect(() => {
    if (user) {
      refreshFolders()
    }
  }, [user, refreshFolders])

  // Reset search query on page navigation
  useEffect(() => {
    setSearchQuery('')
  }, [pathname])

  return (
    <AppContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        sidebarCollapsed,
        setSidebarCollapsed,
        folders,
        refreshFolders,
        theme,
        toggleTheme,
        user,
        loading,
        isAddFolderOpen,
        setIsAddFolderOpen,
        refreshUser: fetchUser
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
