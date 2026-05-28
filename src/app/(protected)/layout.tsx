'use client'

import { useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { Menu, Search, Plus, Trash2, Folder as FolderIcon, LogOut, Sun, Moon, Loader2 } from 'lucide-react'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const {
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
  } = useApp()

  const [newFolderName, setNewFolderName] = useState('')
  const [folderSubmitting, setFolderSubmitting] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const supabase = createClient()

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim() || !user) return
    setFolderSubmitting(true)
    setFolderError(null)

    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim()
        })

      if (error) {
        setFolderError(error.message)
      } else {
        setNewFolderName('')
        setIsAddFolderOpen(false)
        await refreshFolders()
      }
    } catch (err: any) {
      setFolderError(err.message || 'Something went wrong')
    } finally {
      setFolderSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg-base text-text-primary">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  if (!user) {
    return null // Guarded by middleware, so this prevents flashes
  }

  const userInitials = user.email ? user.email.substring(0, 2).toUpperCase() : 'US'
  const displayUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'User'

  // Detect which placeholder to show in the search bar
  const searchPlaceholder = pathname.startsWith('/folder/') 
    ? 'Search reels in folder...' 
    : pathname.startsWith('/recycle-bin')
      ? 'Search deleted reels...'
      : 'Search folders...'

  return (
    <div className="relative min-h-screen flex bg-bg-base text-text-primary overflow-x-hidden">
      
      {/* Side Pane */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] bg-bg-surface border-r border-border-default flex flex-col transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? 'translate-x-[-260px]' : 'translate-x-0'
        }`}
      >
        {/* User Block */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center font-bold text-sm text-text-primary">
            {userInitials}
          </div>
          <span className="font-bold text-sm text-text-primary truncate">{displayUsername}</span>
        </div>

        <div className="h-[1px] bg-border-default w-full" />

        {/* Navigation */}
        <nav className="flex-1 flex flex-col py-4 overflow-y-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-3 transition-all ${
              pathname === '/dashboard' 
                ? 'text-text-primary border-l-accent bg-bg-elevated' 
                : 'text-text-secondary border-l-transparent hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <FolderIcon size={18} />
            Dashboard
          </button>
          
          <button
            onClick={() => router.push('/recycle-bin')}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-3 transition-all ${
              pathname === '/recycle-bin' 
                ? 'text-text-primary border-l-accent bg-bg-elevated' 
                : 'text-text-secondary border-l-transparent hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Trash2 size={18} />
            Recycle Bin
          </button>

          <div className="h-[1px] bg-border-default my-3 w-full" />

          {/* Folder actions */}
          <div className="px-4 mb-2">
            <button
              onClick={() => setIsAddFolderOpen(true)}
              className="w-full btn-ghost py-2 border-dashed flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <Plus size={14} />
              Add Folder
            </button>
          </div>

          {/* Folders List */}
          <div className="flex-1 px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-320px)]">
            <p className="px-3 text-[10px] font-mono tracking-widest text-text-muted uppercase mb-2 mt-4">
              Folders
            </p>
            {folders.length === 0 ? (
              <p className="px-3 text-xs text-text-muted italic">No folders yet</p>
            ) : (
              folders.map((f) => {
                const isActive = params.folderId === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => router.push(`/folder/${f.id}`)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      isActive 
                        ? 'text-text-primary bg-bg-elevated' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <span className="truncate pr-2">📁 {f.name}</span>
                    <span className="text-[10px] font-mono text-text-muted bg-bg-base px-1.5 py-0.5 rounded border border-border-default">
                      {f.reelsCount}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="h-[1px] bg-border-default my-3 w-full" />

          {/* Theme Switcher Row */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-text-secondary">
            <span className="font-medium text-xs tracking-wider uppercase text-text-muted font-mono">Appearance</span>
            <button
              onClick={toggleTheme}
              className={`w-12 h-[26px] bg-bg-elevated border border-border-default rounded-full relative transition-colors duration-200 cursor-pointer ${
                theme === 'dark' ? 'bg-accent border-accent' : ''
              }`}
            >
              <div 
                className={`w-[20px] h-[20px] rounded-full bg-bg-base absolute top-[2px] flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              >
                {theme === 'dark' ? <Moon size={11} className="text-text-primary" /> : <Sun size={11} className="text-accent" />}
              </div>
            </button>
          </div>

          {/* Logout Button */}
          <div className="px-4 mt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-medium text-text-muted hover:text-destructive transition-colors py-2"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-[padding-left] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? 'pl-0' : 'pl-[260px]'
        }`}
      >
        {/* Top Bar */}
        <header className="h-[56px] border-b border-border-default flex items-center justify-between px-6 bg-bg-base sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Toggle */}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn-icon w-9 h-9 flex items-center justify-center bg-transparent border-none text-text-secondary hover:text-text-primary"
            >
              <Menu size={20} />
            </button>

            {/* Search Input */}
            <div className="relative w-full max-w-[560px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-bg-elevated border border-border-default text-text-primary rounded-lg pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-all placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* User Initials Avatar */}
          <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center font-bold text-xs text-text-secondary select-none">
            {userInitials}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>

      {/* Add Folder Dialog Modal */}
      {isAddFolderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md transition-opacity duration-200">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">New Folder</h3>
            
            <form onSubmit={handleCreateFolder} className="space-y-6">
              {folderError && (
                <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
                  {folderError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Travel Reels"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddFolderOpen(false)
                    setNewFolderName('')
                    setFolderError(null)
                  }}
                  className="btn-ghost"
                  disabled={folderSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={folderSubmitting}
                >
                  {folderSubmitting ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : (
                    'Create Folder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
