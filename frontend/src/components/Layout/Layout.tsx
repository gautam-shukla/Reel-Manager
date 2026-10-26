import { useState } from 'react'
import { useNavigate, useLocation, useParams, Outlet } from 'react-router-dom'
import { useApp } from 'contexts/AppContext'
import { createClient } from 'lib/supabase/client'
import { ROUTES } from 'constants/routes'
import { UI } from 'constants/ui'
import { CONFIG } from 'constants/config'
import { Menu, Search, Plus, Trash2, Folder as FolderIcon, LogOut, Sun, Moon, Loader2, Shield } from 'lucide-react'
import { logger } from 'utils/logger'

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const max_size = 96
        const width = img.width
        const height = img.height
        
        const size = Math.min(width, height)
        canvas.width = max_size
        canvas.height = max_size
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(
            img,
            (width - size) / 2,
            (height - size) / 2,
            size,
            size,
            0,
            0,
            max_size,
            max_size
          )
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } else {
          reject(new Error('Canvas context not available'))
        }
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function Layout() {
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
    setIsAddFolderOpen,
    refreshUser
  } = useApp()

  const [newFolderName, setNewFolderName] = useState('')
  const [folderSubmitting, setFolderSubmitting] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  // Account settings states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'password'>('profile')

  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const supabase = createClient()

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate(ROUTES.LOGIN)
  }

  // Open settings panel and initialize values
  const openSettings = () => {
    setNewName(user?.user_metadata?.username || user?.email?.split('@')[0] || '')
    setNewEmail(user?.email || '')
    setNewPassword('')
    setConfirmPassword('')
    setAvatarPreview(user?.user_metadata?.avatar_url || null)
    setSettingsError(null)
    setSettingsSuccess(null)
    setActiveTab('profile')
    setIsSettingsOpen(true)
  }

  // Update profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !user) return
    
    setSettingsLoading(true)
    setSettingsError(null)
    setSettingsSuccess(null)
    
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          username: newName.trim(),
          avatar_url: avatarPreview
        }
      })
      if (authError) throw authError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: newName.trim() })
        .eq('id', user.id)
      if (profileError) throw profileError

      setSettingsSuccess('Profile settings updated successfully!')
      await refreshUser()
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update profile settings.')
    } finally {
      setSettingsLoading(false)
    }
  }

  // Update email handler
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !user) return
    if (newEmail.trim() === user.email) {
      setSettingsError('New email is the same as the current email.')
      return
    }

    setSettingsLoading(true)
    setSettingsError(null)
    setSettingsSuccess(null)

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      })
      if (error) throw error

      setSettingsSuccess('Verification links sent to both your old and new email addresses. Please verify to complete the change.')
      await refreshUser()
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update email address.')
    } finally {
      setSettingsLoading(false)
    }
  }

  // Update password handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !user) return

    if (newPassword !== confirmPassword) {
      setSettingsError(UI.ERRORS.PASSWORD_MISMATCH)
      return
    }

    setSettingsLoading(true)
    setSettingsError(null)
    setSettingsSuccess(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error

      setSettingsSuccess('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update password.')
    } finally {
      setSettingsLoading(false)
    }
  }

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim() || !user) {
      return
    }
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
      setFolderError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
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
    return null
  }

  const userInitials = user.email ? user.email.substring(0, 2).toUpperCase() : 'US'
  const displayUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'User'

  // Detect which placeholder to show in the search bar
  const isFolderPage = location.pathname.startsWith('/folder/')
  const isRecycleBinPage = location.pathname.startsWith(ROUTES.RECYCLE_BIN)

  const searchPlaceholder = isFolderPage
    ? UI.PLACEHOLDERS.SEARCH_REELS
    : isRecycleBinPage
    ? UI.PLACEHOLDERS.SEARCH_DELETED_REELS
    : UI.PLACEHOLDERS.SEARCH_FOLDERS

  // Filter out subfolders in the sidebar
  const rootFolders = folders.filter(f => !f.parent_id)

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
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-border-default select-none"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center font-bold text-sm text-text-primary select-none">
              {userInitials}
            </div>
          )}
          <span className="font-bold text-sm text-text-primary truncate">{displayUsername}</span>
        </div>

        <div className="h-[1px] bg-border-default w-full" />

        {/* Navigation */}
        <nav className="flex-1 flex flex-col py-4 overflow-y-auto">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-3 transition-all cursor-pointer ${
              location.pathname === ROUTES.DASHBOARD
                ? 'text-text-primary border-l-accent bg-bg-elevated'
                : 'text-text-secondary border-l-transparent hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <FolderIcon size={18} />
            {UI.LABELS.DASHBOARD}
          </button>
          
          <button
            onClick={() => navigate(ROUTES.RECYCLE_BIN)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-3 transition-all cursor-pointer ${
              location.pathname === ROUTES.RECYCLE_BIN
                ? 'text-text-primary border-l-accent bg-bg-elevated'
                : 'text-text-secondary border-l-transparent hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Trash2 size={18} />
            {UI.LABELS.RECYCLE_BIN_NAV}
          </button>

          <div className="h-[1px] bg-border-default my-3 w-full" />

          {/* Folder actions */}
          <div className="px-4 mb-2">
            <button
              onClick={() => setIsAddFolderOpen(true)}
              className="w-full btn-ghost py-2 border-dashed flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
            >
              <Plus size={14} />
              {UI.LABELS.ADD_FOLDER_NAV}
            </button>
          </div>

          {/* Folders List */}
          <div className="flex-1 px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-320px)]">
            <p className="px-3 text-[10px] font-mono tracking-widest text-text-muted uppercase mb-2 mt-4">
              {UI.TITLES.MY_FOLDERS}
            </p>
            {rootFolders.length === 0 ? (
              <p className="px-3 text-xs text-text-muted italic">{UI.LABELS.NO_FOLDERS_YET}</p>
            ) : (
              rootFolders.map((f) => {
                const isActive = params.folderId === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => navigate(`/folder/${f.id}`)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'text-text-primary bg-bg-elevated'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <span className="truncate pr-2">{f.name}</span>
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
            <span className="font-medium text-xs tracking-wider uppercase text-text-muted font-mono">{UI.LABELS.APPEARANCE}</span>
            <button
              onClick={toggleTheme}
              className={`w-12 h-[26px] bg-bg-elevated border border-border-default rounded-full relative transition-colors duration-200 cursor-pointer ${
                theme === CONFIG.THEMES.DARK ? 'bg-accent border-accent' : ''
              }`}
            >
              <div
                className={`w-[20px] h-[20px] rounded-full bg-bg-base absolute top-[2px] flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  theme === CONFIG.THEMES.DARK ? 'translate-x-[22px]' : 'translate-x-[2px]'
                }`}
              >
                {theme === CONFIG.THEMES.DARK ? (
                  <Moon size={11} className="text-text-primary" />
                ) : (
                  <Sun size={11} className="text-accent" />
                )}
              </div>
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="mt-auto px-4 pt-3 pb-1 border-t border-border-default/50 space-y-1.5">
            <button
              onClick={() => navigate(ROUTES.PRIVACY_POLICY)}
              className="flex w-full items-center gap-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors py-1 cursor-pointer bg-transparent border-none"
            >
              <Shield size={14} />
              Privacy Policy
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 text-xs font-medium text-text-muted hover:text-destructive transition-colors py-1 cursor-pointer bg-transparent border-none"
            >
              <LogOut size={14} />
              {UI.LABELS.LOGOUT}
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
              className="btn-icon w-9 h-9 flex items-center justify-center bg-transparent border-none text-text-secondary hover:text-text-primary cursor-pointer"
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

          {/* User Initials Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 rounded-full overflow-hidden bg-bg-elevated border border-border-default flex items-center justify-center font-bold text-xs text-text-secondary hover:text-text-primary transition-colors select-none cursor-pointer focus:outline-none"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitials
              )}
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border-default rounded-lg shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false)
                      openSettings()
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
                  >
                    Account Settings
                  </button>
                  <div className="h-[1px] bg-border-default my-1" />
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false)
                      handleLogout()
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    {UI.LABELS.LOGOUT}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>

      {/* Add Folder Dialog Modal */}
      {isAddFolderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md transition-opacity duration-200">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">{UI.TITLES.NEW_FOLDER}</h3>
            
            <form onSubmit={handleCreateFolder} className="space-y-6">
              {folderError && (
                <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
                  {folderError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  {UI.LABELS.FOLDER_NAME}
                </label>
                <input
                  type="text"
                  placeholder={UI.PLACEHOLDERS.FOLDER_NAME_EXP}
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
                  {UI.BUTTONS.CANCEL}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={folderSubmitting}
                >
                  {folderSubmitting ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : (
                    UI.BUTTONS.CREATE_FOLDER
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Settings Dialog Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md transition-opacity duration-200">
          <div className="w-full max-w-[450px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-base font-bold text-text-primary mb-6 font-mono tracking-wide uppercase">Account Settings</h3>
            
            {/* Tabs Header */}
            <div className="flex border-b border-border-default mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile')
                  setSettingsError(null)
                  setSettingsSuccess(null)
                }}
                className={`flex-1 pb-2.5 text-xs font-semibold tracking-wider uppercase font-mono text-center border-b-2 cursor-pointer transition-all ${
                  activeTab === 'profile'
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('email')
                  setSettingsError(null)
                  setSettingsSuccess(null)
                }}
                className={`flex-1 pb-2.5 text-xs font-semibold tracking-wider uppercase font-mono text-center border-b-2 cursor-pointer transition-all ${
                  activeTab === 'email'
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('password')
                  setSettingsError(null)
                  setSettingsSuccess(null)
                }}
                className={`flex-1 pb-2.5 text-xs font-semibold tracking-wider uppercase font-mono text-center border-b-2 cursor-pointer transition-all ${
                  activeTab === 'password'
                    ? 'border-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Password
              </button>
            </div>

            {settingsError && (
              <div className="p-3 mb-4 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 mb-4 text-xs border border-green-500/20 bg-green-500/10 text-green-400 rounded-md">
                {settingsSuccess}
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Profile Photo Upload Section */}
                <div className="flex flex-col items-center gap-4 pb-2">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-elevated border border-border-default flex items-center justify-center font-bold text-2xl text-text-secondary select-none">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        userInitials
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="btn-ghost py-1.5 px-3 text-xs cursor-pointer select-none">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const resized = await resizeImage(file)
                              setAvatarPreview(resized)
                            } catch (err) {
                              logger.error('Error resizing avatar:', err)
                              setSettingsError('Failed to process image.')
                            }
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => setAvatarPreview(null)}
                        className="btn-destructive py-1.5 px-3 text-xs"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                    Name / Username
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="btn-ghost"
                    disabled={settingsLoading}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'email' && (
              <form onSubmit={handleUpdateEmail} className="space-y-6">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="btn-ghost"
                    disabled={settingsLoading}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Update Email'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="btn-ghost"
                    disabled={settingsLoading}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
