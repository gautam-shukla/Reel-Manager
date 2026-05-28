'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Folder {
  id: string
  name: string
  created_at: string
  reels?: { count: number }[]
  reelsCount?: number
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
  
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Fetch current user and theme
  const fetchUser = useCallback(async () => {
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
      console.error('Error fetching user:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Fetch folders
  const refreshFolders = useCallback(async () => {
    if (!user) return
    try {
      const { data: foldersData } = await supabase
        .from('folders')
        .select('*, reels(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Handle the reels count aggregation
      const processed = (foldersData || []).map(f => ({
        ...f,
        reelsCount: f.reels?.[0]?.count || 0
      }))

      setFolders(processed)
    } catch (err) {
      console.error('Error refreshing folders:', err)
    }
  }, [user, supabase])

  // Toggle theme
  const toggleTheme = async () => {
    if (!user) return
    const newTheme = theme === 'dark' ? 'light' : 'dark'
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
      } else {
        setUser(null)
        if (pathname !== '/login') {
          router.push('/login')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser, supabase, router, pathname])

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
        setIsAddFolderOpen
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
